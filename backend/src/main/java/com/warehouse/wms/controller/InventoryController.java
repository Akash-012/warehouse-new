package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.Sku;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.SkuRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('INVENTORY_VIEW')")
public class InventoryController {

    private final InventoryRepository inventoryRepository;
    private final SkuRepository skuRepository;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String state) {

        List<Inventory> all = inventoryRepository.findAllWithDetails();

        List<Inventory> filtered = all.stream()
                .filter(i -> search.isBlank()
                        || i.getSku().getSkuCode().toLowerCase().contains(search.toLowerCase())
                        || (i.getSerialNo() != null && i.getSerialNo().toLowerCase().contains(search.toLowerCase()))
                        || (i.getBatchNo() != null && i.getBatchNo().toLowerCase().contains(search.toLowerCase()))
                        || (i.getBin() != null && i.getBin().getBarcode().toLowerCase().contains(search.toLowerCase())))
                .filter(i -> state.isBlank() || i.getState().name().equalsIgnoreCase(state))
                .toList();

        int total = filtered.size();
        int from  = Math.min(page * size, total);
        int to    = Math.min(from + size, total);

        List<Map<String, Object>> items = filtered.subList(from, to).stream().map(i -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",         i.getId());
            m.put("skuCode",    i.getSku().getSkuCode());
            m.put("skuName",    i.getSku().getDescription());
            m.put("binBarcode", i.getBin() != null ? i.getBin().getBarcode() : null);
            m.put("batchNo",    i.getBatchNo());
            m.put("barcode",    i.getSerialNo());
            m.put("serialNo",   i.getSerialNo());
            m.put("quantity",   i.getQuantity());
            m.put("state",      i.getState().name());
            m.put("expiryDate", i.getExpiryDate());
            m.put("createdAt",  i.getCreatedAt());
            m.put("updatedAt",  i.getUpdatedAt());
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       items);
        result.put("number",         page);
        result.put("totalElements", total);
        result.put("totalPages",    size > 0 ? (int) Math.ceil((double) total / size) : 0);
        result.put("page",          page);
        result.put("size",          size);
        result.put("hasNext",       (page + 1) * size < total);
        return result;
    }

    @GetMapping("/stock-summary")
    public List<Map<String, Object>> stockSummary() {
        List<Object[]> rows = inventoryRepository.findStockSummaryByState();

        // Aggregate per SKU: collect qty per state
        Map<String, Map<String, Object>> bySkuCode = new java.util.LinkedHashMap<>();
        for (Object[] row : rows) {
            Long   skuId   = ((Number) row[0]).longValue();
            String skuCode = (String) row[1];
            String skuName = (String) row[2];
            String category = (String) row[3];
            String state   = row[4].toString();
            long   qty     = ((Number) row[5]).longValue();

            Map<String, Object> entry = bySkuCode.computeIfAbsent(skuCode, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("skuId",         skuId);
                m.put("skuCode",       skuCode);
                m.put("skuName",       skuName);
                m.put("category",      category);
                m.put("availableQty",  0L);
                m.put("unavailableQty", 0L);
                m.put("totalQty",      0L);
                m.put("lowStockThreshold", row[6]);
                return m;
            });

            long total = ((Number) entry.get("totalQty")).longValue() + qty;
            entry.put("totalQty", total);

            if ("AVAILABLE".equals(state)) {
                entry.put("availableQty", ((Number) entry.get("availableQty")).longValue() + qty);
            } else {
                entry.put("unavailableQty", ((Number) entry.get("unavailableQty")).longValue() + qty);
            }
        }

        // Add status and low-stock fields
        bySkuCode.values().forEach(e -> {
            long avail = ((Number) e.get("availableQty")).longValue();
            e.put("status", avail > 0 ? "AVAILABLE" : "UNAVAILABLE");
            Integer threshold = e.get("lowStockThreshold") != null
                    ? ((Number) e.get("lowStockThreshold")).intValue() : null;
            e.put("isLowStock", threshold != null && avail <= threshold);
        });

        return new java.util.ArrayList<>(bySkuCode.values());
    }

    @PutMapping("/low-stock-threshold/{skuId}")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUST')")
    public ResponseEntity<Map<String, Object>> setLowStockThreshold(
            @PathVariable Long skuId,
            @RequestBody Map<String, Object> body) {
        Sku sku = skuRepository.findById(skuId)
                .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + skuId));
        Object val = body.get("threshold");
        sku.setLowStockThreshold(val == null || val.toString().isBlank() ? null
                : Integer.parseInt(val.toString()));
        skuRepository.save(sku);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("skuId", sku.getId());
        resp.put("skuCode", sku.getSkuCode());
        resp.put("lowStockThreshold", sku.getLowStockThreshold());
        return ResponseEntity.ok(resp);
    }


    @GetMapping("/low-stock-alerts")
    public List<Map<String, Object>> getLowStockAlerts() {
        List<Map<String, Object>> summary = stockSummary();
        return summary.stream()
                .filter(e -> Boolean.TRUE.equals(e.get("isLowStock")))
                .toList();
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUST')")
    public ResponseEntity<Map<String, Object>> adjust(@RequestBody Map<String, Object> body) {
        Long inventoryId = Long.valueOf(body.get("inventoryId").toString());
        int  quantity    = Integer.parseInt(body.get("quantity").toString());
        String reason    = body.getOrDefault("reason", "MANUAL").toString();

        Inventory inv = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found: " + inventoryId));
        inv.setQuantity(quantity);
        inventoryRepository.save(inv);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("inventoryId",  inv.getId());
        resp.put("newQuantity",  inv.getQuantity());
        resp.put("state",        inv.getState().name());
        resp.put("reason",       reason);
        return ResponseEntity.ok(resp);
    }
}
