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
import com.warehouse.wms.service.PutawayEngineService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InboundService {

    private static final Logger log = LoggerFactory.getLogger(InboundService.class);
    private static final String RECEIVE_DOCK_BARCODE = "RECV_DOCK";

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderLineRepository purchaseOrderLineRepository;
    private final BinRepository binRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final GoodsReceiptLineRepository goodsReceiptLineRepository;
    private final InventoryRepository inventoryRepository;
    private final SkuRepository skuRepository;
    private final PutawayEngineService putawayEngineService;

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

        for (ReceivePOLineRequest lineRequest : request.getLines()) {
            Sku sku = skuRepository.findBySkuCode(lineRequest.getSkuCode())
                    .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + lineRequest.getSkuCode()));

            PurchaseOrderLine poLine = purchaseOrderLineRepository
                    .findByPurchaseOrderIdAndSkuId(po.getId(), sku.getId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "PO line not found for poId=" + po.getId() + ", skuCode=" + lineRequest.getSkuCode()));

            long alreadyReceived = inventoryRepository.countReceivedForPurchaseOrderSku(po.getId(), sku.getId());
            if (alreadyReceived + lineRequest.getQuantity() > poLine.getQuantity()) {
                throw new IllegalArgumentException("Received quantity exceeds ordered quantity for skuCode=" + lineRequest.getSkuCode());
            }

            GoodsReceiptLine grnLine = new GoodsReceiptLine();
            grnLine.setGoodsReceipt(goodsReceipt);
            grnLine.setSku(sku);
            grnLine.setBatchNo(lineRequest.getBatchNo());
            grnLine.setQuantityReceived(lineRequest.getQuantity());
            grnLine = goodsReceiptLineRepository.save(grnLine);
            grnLines.add(grnLine);

            long existingCount = inventoryRepository.countBySkuIdAndBatchNo(sku.getId(), lineRequest.getBatchNo());
            for (int i = 1; i <= lineRequest.getQuantity(); i++) {
                Inventory inventory = new Inventory();
                inventory.setSku(sku);
                inventory.setBin(receiveDock);
                inventory.setBatchNo(lineRequest.getBatchNo());
                inventory.setQuantity(1);
                inventory.setState(Inventory.InventoryState.RECEIVED);
                inventory.setSerialNo(buildItemBarcode(sku.getSkuCode(), lineRequest.getBatchNo(), existingCount + i));
                inventory.setGoodsReceiptLine(grnLine);
                inventoryRepository.save(inventory);
            }
            totalItems += lineRequest.getQuantity();
        }

        goodsReceipt.setLines(grnLines);
        GoodsReceipt saved = goodsReceiptRepository.save(goodsReceipt);

        boolean fullyReceived = po.getLines() != null && !po.getLines().isEmpty() &&
            po.getLines().stream().allMatch(poLine ->
                inventoryRepository.countReceivedForPurchaseOrderSku(po.getId(), poLine.getSku().getId()) >= poLine.getQuantity()
            );
        po.setStatus(fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED");
        purchaseOrderRepository.save(po);

        try {
            putawayEngineService.generatePutawayTasks(saved.getId());
        } catch (Exception e) {
            log.warn("Putaway task generation failed for GRN {}: {}", saved.getId(), e.getMessage());
        }

        return toGrnResponse(saved, totalItems);
    }

    @Transactional
    public GRNResponse getGRN(Long grnId) {
        GoodsReceipt grn = goodsReceiptRepository.findById(grnId)
                .orElseThrow(() -> new EntityNotFoundException("GRN not found: " + grnId));

        int totalItems = grn.getLines().stream().mapToInt(GoodsReceiptLine::getQuantityReceived).sum();
        return toGrnResponse(grn, totalItems);
    }

    private GRNResponse toGrnResponse(GoodsReceipt grn, int totalItems) {
        List<GRNLineResponse> lines = grn.getLines().stream()
                .map(line -> GRNLineResponse.builder()
                        .skuId(line.getSku().getId())
                        .skuCode(line.getSku().getSkuCode())
                        .batchNo(line.getBatchNo())
                        .quantity(line.getQuantityReceived())
                        .build())
                .toList();

        return GRNResponse.builder()
                .grnNo(grn.getGrnNo())
                .purchaseOrderId(grn.getPurchaseOrder().getId())
                .lines(lines)
                .totalItems(totalItems)
                .createdAt(grn.getCreatedAt())
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
