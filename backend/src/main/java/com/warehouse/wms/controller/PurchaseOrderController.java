package com.warehouse.wms.controller;

import com.warehouse.wms.dto.CreatePORequest;
import com.warehouse.wms.entity.PurchaseOrder;
import com.warehouse.wms.entity.PurchaseOrderLine;
import com.warehouse.wms.entity.Sku;
import com.warehouse.wms.entity.Warehouse;
import com.warehouse.wms.repository.PurchaseOrderRepository;
import com.warehouse.wms.repository.SkuRepository;
import com.warehouse.wms.repository.WarehouseRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('INBOUND_VIEW')")
public class PurchaseOrderController {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final WarehouseRepository warehouseRepository;
    private final SkuRepository skuRepository;

    @PostMapping
    @PreAuthorize("hasAuthority('INBOUND_RECEIVE')")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreatePORequest request) {
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + request.getWarehouseId()));

        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-" + System.currentTimeMillis());
        po.setSupplier(request.getSupplier());
        po.setExpectedArrivalDate(request.getExpectedArrivalDate());
        po.setStatus("PENDING");

        List<PurchaseOrderLine> lines = new ArrayList<>();
        for (CreatePORequest.LineItem item : request.getLines()) {
            Sku sku = skuRepository.findById(item.getSkuId())
                    .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + item.getSkuId()));
            PurchaseOrderLine line = new PurchaseOrderLine();
            line.setPurchaseOrder(po);
            line.setSku(sku);
            line.setQuantity(item.getQuantity());
            lines.add(line);
        }
        po.setLines(lines);
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("poNumber", saved.getPoNumber());
        result.put("supplier", saved.getSupplier());
        result.put("status", saved.getStatus());
        result.put("warehouseId", warehouse.getId());
        result.put("warehouseName", warehouse.getName());
        result.put("expectedArrivalDate", saved.getExpectedArrivalDate());
        result.put("lineCount", saved.getLines().size());
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return purchaseOrderRepository.findAllSummary().stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", row[0]);
            m.put("poNumber", row[1]);
            m.put("supplier", row[2]);
            m.put("status", row[3]);
            m.put("lineCount", row[4]);
            m.put("expectedArrivalDate", row[5]);
            return m;
        }).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable Long id) {
        var po = purchaseOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found: " + id));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", po.getId());
        result.put("poNumber", po.getPoNumber());
        result.put("supplier", po.getSupplier());
        result.put("status", po.getStatus());
        result.put("expectedArrivalDate", po.getExpectedArrivalDate());
        result.put("lines", po.getLines().stream().map(line -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", line.getId());
            m.put("skuId", line.getSku().getId());
            m.put("skuCode", line.getSku().getSkuCode());
            m.put("orderedQuantity", line.getQuantity());
            return m;
        }).toList());
        return result;
    }
}
