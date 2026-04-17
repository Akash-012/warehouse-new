package com.warehouse.wms.service;

import com.warehouse.wms.dto.GRNLineResponse;
import com.warehouse.wms.dto.GRNResponse;
import com.warehouse.wms.dto.ReceivePOLineRequest;
import com.warehouse.wms.dto.ReceivePORequest;
import com.warehouse.wms.entity.Bin;
import com.warehouse.wms.entity.GoodsReceipt;
import com.warehouse.wms.entity.GoodsReceiptLine;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.PurchaseOrder;
import com.warehouse.wms.entity.PurchaseOrderLine;
import com.warehouse.wms.entity.Sku;
import com.warehouse.wms.repository.BinRepository;
import com.warehouse.wms.repository.GoodsReceiptLineRepository;
import com.warehouse.wms.repository.GoodsReceiptRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PurchaseOrderLineRepository;
import com.warehouse.wms.repository.PurchaseOrderRepository;
import com.warehouse.wms.repository.SkuRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InboundService {

    private static final String RECEIVE_DOCK_BARCODE = "RECV_DOCK";

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderLineRepository purchaseOrderLineRepository;
    private final BinRepository binRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final GoodsReceiptLineRepository goodsReceiptLineRepository;
    private final InventoryRepository inventoryRepository;
    private final SkuRepository skuRepository;
    private final PutawayEngineService putawayEngineService;

    /**
     * Returns pre-filled receive lines for a PO — skuCode auto-fetched from PO lines,
     * batchNo auto-generated as BATCH-{YYYYMM}-{skuCode}, remaining qty calculated.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> buildReceiveLines(Long poId) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithLines(poId)
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found: " + poId));

        String yearMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        List<Map<String, Object>> result = new ArrayList<>();

        for (PurchaseOrderLine line : po.getLines()) {
            Sku sku = line.getSku();
            long alreadyReceived = inventoryRepository.countReceivedForPurchaseOrderSku(poId, sku.getId());
            int remaining = (int) Math.max(0, line.getQuantity() - alreadyReceived);
            if (remaining == 0) continue; // fully received — skip

            String autoBatch = "BATCH-" + yearMonth + "-" + sku.getSkuCode();

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("skuId",          sku.getId());
            m.put("skuCode",        sku.getSkuCode());
            m.put("skuDescription", sku.getDescription());
            m.put("orderedQty",     line.getQuantity());
            m.put("alreadyReceived", (int) alreadyReceived);
            m.put("remainingQty",   remaining);
            m.put("quantity",       remaining);
            m.put("batchNo",        autoBatch);
            m.put("unitPrice",      line.getUnitPrice());
            m.put("sgstRate",       line.getSgstRate());
            m.put("cgstRate",       line.getCgstRate());
            result.add(m);
        }
        return result;
    }

    @Transactional
    public GRNResponse receivePO(ReceivePORequest request) {
        PurchaseOrder po = purchaseOrderRepository.findById(request.getPoId())
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found: " + request.getPoId()));

        if (request.getPriority() != null) {
            po.setPriority(request.getPriority());
        }

        Bin receiveDock = ensureSpecialBin(RECEIVE_DOCK_BARCODE);

        GoodsReceipt goodsReceipt = new GoodsReceipt();
        goodsReceipt.setPurchaseOrder(po);
        goodsReceipt.setGrnNo(generateGrnNo(po.getId()));
        goodsReceipt = goodsReceiptRepository.save(goodsReceipt);

        List<GoodsReceiptLine> grnLines = new ArrayList<>();
        int totalItems = 0;
        String yearMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));

        for (ReceivePOLineRequest lineRequest : request.getLines()) {
            // Auto-resolve SKU — skuCode is required (pre-filled from PO lines)
            Sku sku = skuRepository.findBySkuCode(lineRequest.getSkuCode())
                    .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + lineRequest.getSkuCode()));

            PurchaseOrderLine poLine = purchaseOrderLineRepository
                    .findByPurchaseOrderIdAndSkuId(po.getId(), sku.getId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "PO line not found for poId=" + po.getId() + ", skuCode=" + lineRequest.getSkuCode()));

            // Auto-generate batchNo if not provided
            String batchNo = (lineRequest.getBatchNo() == null || lineRequest.getBatchNo().isBlank())
                    ? "BATCH-" + yearMonth + "-" + sku.getSkuCode()
                    : lineRequest.getBatchNo();

            long alreadyReceived = inventoryRepository.countReceivedForPurchaseOrderSku(po.getId(), sku.getId());
            if (alreadyReceived + lineRequest.getQuantity() > poLine.getQuantity()) {
                throw new IllegalArgumentException(
                    "Received quantity (" + (alreadyReceived + lineRequest.getQuantity()) +
                    ") exceeds ordered quantity (" + poLine.getQuantity() + ") for skuCode=" + lineRequest.getSkuCode());
            }

            GoodsReceiptLine grnLine = new GoodsReceiptLine();
            grnLine.setGoodsReceipt(goodsReceipt);
            grnLine.setSku(sku);
            grnLine.setBatchNo(batchNo);
            grnLine.setQuantityReceived(lineRequest.getQuantity());
            grnLine = goodsReceiptLineRepository.save(grnLine);
            grnLines.add(grnLine);

            long existingCount = inventoryRepository.countBySkuIdAndBatchNo(sku.getId(), batchNo);
            for (int i = 1; i <= lineRequest.getQuantity(); i++) {
                Inventory inventory = new Inventory();
                inventory.setSku(sku);
                inventory.setBin(receiveDock);
                inventory.setBatchNo(batchNo);
                inventory.setQuantity(1);
                inventory.setState(Inventory.InventoryState.RECEIVED);
                inventory.setSerialNo(buildItemBarcode(sku.getSkuCode(), batchNo, existingCount + i));
                inventory.setGoodsReceiptLine(grnLine);
                inventoryRepository.save(inventory);
            }
            totalItems += lineRequest.getQuantity();
        }

        goodsReceipt.setLines(grnLines);
        GoodsReceipt saved = goodsReceiptRepository.save(goodsReceipt);

        PurchaseOrder poWithLines = purchaseOrderRepository.findByIdWithLines(po.getId()).orElse(po);
        boolean fullyReceived = poWithLines.getLines() != null && !poWithLines.getLines().isEmpty() &&
            poWithLines.getLines().stream().allMatch(poLine ->
                inventoryRepository.countReceivedForPurchaseOrderSku(po.getId(), poLine.getSku().getId()) >= poLine.getQuantity()
            );
        po.setStatus(fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED");
        purchaseOrderRepository.save(po);

        putawayEngineService.generatePutawayTasks(saved.getId());

        return toGrnResponse(saved, totalItems);
    }

    @Transactional(readOnly = true)
    public GRNResponse getGRN(Long grnId) {
        GoodsReceipt grn = goodsReceiptRepository.findById(grnId)
                .orElseThrow(() -> new EntityNotFoundException("GRN not found: " + grnId));
        int totalItems = grn.getLines().stream().mapToInt(GoodsReceiptLine::getQuantityReceived).sum();
        return toGrnResponse(grn, totalItems);
    }

    @Transactional(readOnly = true)
    public List<GRNResponse> listAllGRNs() {
        return goodsReceiptRepository.findAll().stream()
                .map(grn -> {
                    int total = grn.getLines().stream().mapToInt(GoodsReceiptLine::getQuantityReceived).sum();
                    return toGrnResponse(grn, total);
                })
                .toList();
    }

    private GRNResponse toGrnResponse(GoodsReceipt grn, int totalItems) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithLines(grn.getPurchaseOrder().getId())
                .orElse(grn.getPurchaseOrder());
        java.math.BigDecimal ZERO = java.math.BigDecimal.ZERO;

        List<GRNLineResponse> lines = grn.getLines().stream()
                .map(line -> {
                    PurchaseOrderLine poLine = po.getLines() == null ? null :
                            po.getLines().stream()
                                    .filter(pl -> pl.getSku().getId().equals(line.getSku().getId()))
                                    .findFirst().orElse(null);

                    Integer orderedQty = poLine != null ? poLine.getQuantity() : null;
                    int received = line.getQuantityReceived();

                    int totalReceivedForSku = orderedQty != null
                            ? (int) inventoryRepository.countReceivedForPurchaseOrderSku(po.getId(), line.getSku().getId())
                            : received;
                    int pending = orderedQty != null ? Math.max(0, orderedQty - totalReceivedForSku) : 0;

                    java.math.BigDecimal unitPrice = poLine != null && poLine.getUnitPrice() != null ? poLine.getUnitPrice() : ZERO;
                    java.math.BigDecimal sgstRate  = poLine != null && poLine.getSgstRate()  != null ? poLine.getSgstRate()  : ZERO;
                    java.math.BigDecimal cgstRate  = poLine != null && poLine.getCgstRate()  != null ? poLine.getCgstRate()  : ZERO;

                    java.math.BigDecimal lineTotal = unitPrice.multiply(java.math.BigDecimal.valueOf(received));
                    java.math.BigDecimal sgstAmt   = lineTotal.multiply(sgstRate).divide(java.math.BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                    java.math.BigDecimal cgstAmt   = lineTotal.multiply(cgstRate).divide(java.math.BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                    java.math.BigDecimal gstAmt    = sgstAmt.add(cgstAmt);

                    return GRNLineResponse.builder()
                            .skuId(line.getSku().getId())
                            .skuCode(line.getSku().getSkuCode())
                            .skuDescription(line.getSku().getDescription())
                            .batchNo(line.getBatchNo())
                            .orderedQty(orderedQty)
                            .receivedQty(received)
                            .pendingQty(pending)
                            .unitPrice(unitPrice)
                            .lineTotal(lineTotal)
                            .sgstRate(sgstRate)
                            .cgstRate(cgstRate)
                            .sgstAmount(sgstAmt)
                            .cgstAmount(cgstAmt)
                            .gstAmount(gstAmt)
                            .lineTotalWithTax(lineTotal.add(gstAmt))
                            .build();
                })
                .toList();

        java.math.BigDecimal subTotal  = lines.stream().map(GRNLineResponse::getLineTotal).reduce(ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal totalSgst = lines.stream().map(GRNLineResponse::getSgstAmount).reduce(ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal totalCgst = lines.stream().map(GRNLineResponse::getCgstAmount).reduce(ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal totalGst  = totalSgst.add(totalCgst);
        int totalOrdered = lines.stream().mapToInt(l -> l.getOrderedQty() != null ? l.getOrderedQty() : 0).sum();
        int totalPending = lines.stream().mapToInt(l -> l.getPendingQty() != null ? l.getPendingQty() : 0).sum();

        return GRNResponse.builder()
                .id(grn.getId())
                .grnNo(grn.getGrnNo())
                .purchaseOrderId(po.getId())
                .poNumber(po.getPoNumber())
                .supplier(po.getSupplier())
                .lines(lines)
                .totalItems(totalItems)
                .totalOrdered(totalOrdered)
                .totalPending(totalPending)
                .createdAt(grn.getCreatedAt())
                .subTotal(subTotal)
                .totalSgst(totalSgst)
                .totalCgst(totalCgst)
                .totalGst(totalGst)
                .grandTotal(subTotal.add(totalGst))
                .build();
    }

    private String generateGrnNo(Long poId) {
        return "GRN-" + poId + "-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private String buildItemBarcode(String skuCode, String batchNo, long sequence) {
        return skuCode + "-" + batchNo + "-" + String.format("%05d", sequence);
    }

    private Bin ensureSpecialBin(String barcode) {
        return binRepository.findByBarcode(barcode).orElseGet(() -> {
            Bin bin = new Bin();
            bin.setBarcode(barcode);
            bin.setLengthCm(BigDecimal.valueOf(9999));
            bin.setWidthCm(BigDecimal.valueOf(9999));
            bin.setHeightCm(BigDecimal.valueOf(9999));
            bin.setMaxWeightG(BigDecimal.valueOf(99_999_999));
            bin.setOccupiedVolumeCm3(BigDecimal.ZERO);
            bin.setOccupiedWeightG(BigDecimal.ZERO);
            bin.setStatus(Bin.BinStatus.AVAILABLE);
            return binRepository.save(bin);
        });
    }
}
