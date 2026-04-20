package com.warehouse.wms.service;

import com.warehouse.wms.dto.CreatePORequest;
import com.warehouse.wms.dto.POResponse;
import com.warehouse.wms.dto.UpdatePORequest;
import com.warehouse.wms.entity.PurchaseOrder;
import com.warehouse.wms.entity.PurchaseOrderLine;
import com.warehouse.wms.entity.Sku;
import com.warehouse.wms.exception.PoNotEditableException;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PurchaseOrderLineRepository;
import com.warehouse.wms.repository.PurchaseOrderRepository;
import com.warehouse.wms.repository.SkuRepository;
import com.warehouse.wms.repository.WarehouseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private static final Set<String> EDITABLE_STATUSES = Set.of("PENDING", "OPEN");

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderLineRepository purchaseOrderLineRepository;
    private final WarehouseRepository warehouseRepository;
    private final SkuRepository skuRepository;
    private final InventoryRepository inventoryRepository;

    @Transactional
    public POResponse create(CreatePORequest request) {
        warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + request.getWarehouseId()));

        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-" + System.currentTimeMillis());
        po.setSupplier(request.getSupplier());
        po.setExpectedArrivalDate(request.getExpectedArrivalDate());
        po.setStatus("PENDING");
        po.setPriority(request.getPriority() != null ? request.getPriority() : PurchaseOrder.Priority.P2);
        // Save PO first to get ID, then attach lines
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        List<PurchaseOrderLine> lines = buildLines(saved, request.getLines());
        saved.setLines(lines);

        return toResponse(purchaseOrderRepository.save(saved));
    }

    @Transactional
    public POResponse update(Long id, UpdatePORequest request) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found: " + id));

        if (!EDITABLE_STATUSES.contains(po.getStatus())) {
            throw new PoNotEditableException(po.getPoNumber(), po.getStatus());
        }

        if (request.getSupplier() != null && !request.getSupplier().isBlank()) {
            po.setSupplier(request.getSupplier());
        }
        if (request.getExpectedArrivalDate() != null) {
            po.setExpectedArrivalDate(request.getExpectedArrivalDate());
        }
        if (request.getPriority() != null) {
            po.setPriority(request.getPriority());
        }

        if (request.getLines() != null && !request.getLines().isEmpty()) {
            for (UpdatePORequest.LineItem lineItem : request.getLines()) {
                Sku sku = skuRepository.findById(lineItem.getSkuId())
                        .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + lineItem.getSkuId()));

                if (lineItem.getId() != null) {
                    PurchaseOrderLine existing = purchaseOrderLineRepository.findById(lineItem.getId())
                            .orElseThrow(() -> new EntityNotFoundException("PO line not found: " + lineItem.getId()));
                    existing.setQuantity(lineItem.getQuantity());
                    existing.setSku(sku);
                    if (lineItem.getUnitPrice() != null) existing.setUnitPrice(lineItem.getUnitPrice());
                    if (lineItem.getSgstRate() != null) existing.setSgstRate(lineItem.getSgstRate());
                    if (lineItem.getCgstRate() != null) existing.setCgstRate(lineItem.getCgstRate());
                    purchaseOrderLineRepository.save(existing);
                } else {
                    PurchaseOrderLine newLine = new PurchaseOrderLine();
                    newLine.setPurchaseOrder(po);
                    newLine.setSku(sku);
                    newLine.setQuantity(lineItem.getQuantity());
                    newLine.setUnitPrice(lineItem.getUnitPrice());
                    newLine.setSgstRate(lineItem.getSgstRate());
                    newLine.setCgstRate(lineItem.getCgstRate());
                    purchaseOrderLineRepository.save(newLine);
                }
            }
        }

        return toResponse(purchaseOrderRepository.save(po));
    }

    public POResponse getById(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found: " + id));
        return toResponse(po);
    }

    public List<POResponse> listAll() {
        List<PurchaseOrder> pos = purchaseOrderRepository.findAllWithLines();
        if (pos.isEmpty()) return List.of();

        // Batch-load received counts to avoid N+1
        List<Long> poIds = pos.stream().map(PurchaseOrder::getId).toList();
        List<Object[]> counts = purchaseOrderRepository.countReceivedByPoIds(poIds);
        // Build map: poId -> skuId -> receivedCount
        Map<Long, Map<Long, Long>> receivedMap = new HashMap<>();
        for (Object[] row : counts) {
            Long poId  = ((Number) row[0]).longValue();
            Long skuId = ((Number) row[1]).longValue();
            Long cnt   = ((Number) row[2]).longValue();
            receivedMap.computeIfAbsent(poId, k -> new HashMap<>()).put(skuId, cnt);
        }

        return pos.stream().map(po -> toResponseWithCounts(po, receivedMap.getOrDefault(po.getId(), Map.of()))).toList();
    }

    private POResponse toResponseWithCounts(PurchaseOrder po, Map<Long, Long> receivedCounts) {
        List<POResponse.LineItem> lines = po.getLines() == null ? List.of() :
                po.getLines().stream().map(l -> POResponse.LineItem.builder()
                        .id(l.getId())
                        .skuId(l.getSku().getId())
                        .skuCode(l.getSku().getSkuCode())
                        .skuDescription(l.getSku().getDescription())
                        .quantity(l.getQuantity())
                        .receivedQty(receivedCounts.getOrDefault(l.getSku().getId(), 0L).intValue())
                        .unitPrice(l.getUnitPrice())
                        .sgstRate(l.getSgstRate())
                        .cgstRate(l.getCgstRate())
                        .build()).toList();

        return POResponse.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .supplier(po.getSupplier())
                .status(po.getStatus())
                .priority(po.getPriority())
                .expectedArrivalDate(po.getExpectedArrivalDate())
                .createdAt(po.getCreatedAt())
                .updatedAt(po.getUpdatedAt())
                .lines(lines)
                .build();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Sku resolveOrCreateSku(CreatePORequest.LineItem item) {
        if (item.getSkuId() != null) {
            return skuRepository.findById(item.getSkuId())
                    .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + item.getSkuId()));
        }
        if (item.getProductName() == null || item.getProductName().isBlank()) {
            throw new IllegalArgumentException("Either skuId or productName is required for each line");
        }
        // Auto-generate next available SKU code: SKU-0001, SKU-0002, ...
        long count = skuRepository.count();
        String skuCode;
        do {
            count++;
            skuCode = String.format("SKU-%04d", count);
        } while (skuRepository.findBySkuCode(skuCode).isPresent());

        Sku sku = new Sku();
        sku.setSkuCode(skuCode);
        sku.setDescription(item.getProductName().trim());
        sku.setCategory(item.getCategory() != null && !item.getCategory().isBlank() ? item.getCategory().trim() : null);
        return skuRepository.save(sku);
    }

    private List<PurchaseOrderLine> buildLines(PurchaseOrder po, List<CreatePORequest.LineItem> items) {
        List<PurchaseOrderLine> lines = new ArrayList<>();
        for (CreatePORequest.LineItem item : items) {
            Sku sku = resolveOrCreateSku(item);
            PurchaseOrderLine line = new PurchaseOrderLine();
            line.setPurchaseOrder(po);
            line.setSku(sku);
            line.setQuantity(item.getQuantity());
            line.setUnitPrice(item.getUnitPrice());
            line.setSgstRate(item.getSgstRate());
            line.setCgstRate(item.getCgstRate());
            lines.add(line);
        }
        return lines;
    }

    private POResponse toResponse(PurchaseOrder po) {
        List<POResponse.LineItem> lines = po.getLines() == null ? List.of() :
                po.getLines().stream().map(l -> POResponse.LineItem.builder()
                        .id(l.getId())
                        .skuId(l.getSku().getId())
                        .skuCode(l.getSku().getSkuCode())
                        .skuDescription(l.getSku().getDescription())
                        .quantity(l.getQuantity())
                        .receivedQty((int) inventoryRepository.countReceivedForPurchaseOrderSku(po.getId(), l.getSku().getId()))
                        .unitPrice(l.getUnitPrice())
                        .sgstRate(l.getSgstRate())
                        .cgstRate(l.getCgstRate())
                        .build()).toList();

        return POResponse.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .supplier(po.getSupplier())
                .status(po.getStatus())
                .priority(po.getPriority())
                .expectedArrivalDate(po.getExpectedArrivalDate())
                .createdAt(po.getCreatedAt())
                .updatedAt(po.getUpdatedAt())
                .lines(lines)
                .build();
    }
}
