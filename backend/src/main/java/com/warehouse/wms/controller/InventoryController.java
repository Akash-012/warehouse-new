package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Bin;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.Sku;
import com.warehouse.wms.repository.BinRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.SkuRepository;
import com.warehouse.wms.repository.WarehouseRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('INVENTORY_VIEW')")
public class InventoryController {

    private final InventoryRepository inventoryRepository;
    private final SkuRepository skuRepository;
    private final BinRepository binRepository;
    private final WarehouseRepository warehouseRepository;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String state,
            @RequestParam(defaultValue = "") String warehouse) {

        List<Inventory> all = inventoryRepository.findAll();

        List<Inventory> filtered = filterInventory(all, search, state, warehouse);

        int total = filtered.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        List<Inventory> paged = filtered.subList(from, to);

        List<Map<String, Object>> items = paged.stream().map(this::toInventoryView).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", items);
        result.put("totalElements", total);
        result.put("totalPages", size > 0 ? (int) Math.ceil((double) total / size) : 0);
        result.put("number", page);
        result.put("hasNext", to < total);
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    @GetMapping("/{id}")
    public Map<String, Object> getById(@PathVariable Long id) {
        Inventory item = inventoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found: " + id));
        return toInventoryView(item);
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        List<Map<String, Object>> skus = skuRepository.findAll().stream()
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", s.getId());
                    m.put("skuCode", s.getSkuCode());
                    m.put("description", s.getDescription());
                    return m;
                })
                .toList();

        List<Map<String, Object>> bins = binRepository.findAll().stream()
                .map(b -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", b.getId());
                    m.put("barcode", b.getBarcode());
                    return m;
                })
                .toList();

        List<Map<String, Object>> warehouses = warehouseRepository.findAll().stream()
                .map(w -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", w.getId());
                    m.put("name", w.getName());
                    return m;
                })
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("skus", skus);
        result.put("bins", bins);
        result.put("warehouses", warehouses);
        result.put("states", java.util.Arrays.stream(Inventory.InventoryState.values()).map(Enum::name).toList());
        return result;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('INVENTORY_ADJUST')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Inventory inv = new Inventory();
        applyInventoryFromBody(inv, body);
        Inventory saved = inventoryRepository.save(inv);
        return ResponseEntity.ok(toInventoryView(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUST')")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Inventory inv = inventoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found: " + id));
        applyInventoryFromBody(inv, body);
        Inventory saved = inventoryRepository.save(inv);
        return ResponseEntity.ok(toInventoryView(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUST')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!inventoryRepository.existsById(id)) {
            throw new EntityNotFoundException("Inventory not found: " + id);
        }
        inventoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String state,
            @RequestParam(defaultValue = "") String warehouse) {

        List<Inventory> filtered = filterInventory(inventoryRepository.findAll(), search, state, warehouse);
        long totalItems = filtered.size();
        long totalQuantity = filtered.stream().mapToLong(i -> i.getQuantity() != null ? i.getQuantity() : 0).sum();
        long availableQuantity = filtered.stream()
                .filter(i -> i.getState() == Inventory.InventoryState.AVAILABLE)
                .mapToLong(i -> i.getQuantity() != null ? i.getQuantity() : 0)
                .sum();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalItems", totalItems);
        result.put("totalQuantity", totalQuantity);
        result.put("availableQuantity", availableQuantity);
        return result;
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUST')")
    public ResponseEntity<Map<String, Object>> adjust(@RequestBody Map<String, Object> body) {
        Long inventoryId = Long.valueOf(body.get("inventoryId").toString());
        int quantity = Integer.parseInt(body.get("quantity").toString());
        String reason = body.getOrDefault("reason", "MANUAL").toString();

        Inventory inv = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found: " + inventoryId));
        inv.setQuantity(quantity);
        inventoryRepository.save(inv);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("inventoryId", inv.getId());
        resp.put("newQuantity", inv.getQuantity());
        resp.put("reason", reason);
        return ResponseEntity.ok(resp);
    }

    private void applyInventoryFromBody(Inventory inv, Map<String, Object> body) {
        if (!body.containsKey("skuId")) {
            throw new IllegalArgumentException("skuId is required");
        }

        Long skuId = Long.valueOf(body.get("skuId").toString());
        Sku sku = skuRepository.findById(skuId)
                .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + skuId));
        inv.setSku(sku);

        Object binRaw = body.get("binId");
        if (binRaw != null && !binRaw.toString().isBlank()) {
            Long binId = Long.valueOf(binRaw.toString());
            Bin bin = binRepository.findById(binId)
                    .orElseThrow(() -> new EntityNotFoundException("Bin not found: " + binId));
            inv.setBin(bin);
        } else {
            inv.setBin(null);
        }

        inv.setBatchNo(body.getOrDefault("batchNo", "").toString().trim());

        String serialNo = body.getOrDefault("serialNo", body.getOrDefault("barcode", "")).toString().trim();
        if (serialNo.isBlank()) {
            throw new IllegalArgumentException("barcode is required");
        }
        inv.setSerialNo(serialNo);

        int quantity = Integer.parseInt(body.getOrDefault("quantity", "0").toString());
        if (quantity < 0) {
            throw new IllegalArgumentException("quantity must be 0 or greater");
        }
        inv.setQuantity(quantity);

        String rawState = body.getOrDefault("state", Inventory.InventoryState.AVAILABLE.name()).toString();
        inv.setState(Inventory.InventoryState.valueOf(rawState.toUpperCase(Locale.ROOT)));
    }

    private Map<String, Object> toInventoryView(Inventory i) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", i.getId());
        m.put("skuId", i.getSku() != null ? i.getSku().getId() : null);
        m.put("skuCode", i.getSku() != null ? i.getSku().getSkuCode() : null);
        m.put("skuName", i.getSku() != null ? i.getSku().getDescription() : null);
        m.put("barcode", i.getSerialNo());
        m.put("serialNo", i.getSerialNo());
        m.put("binId", i.getBin() != null ? i.getBin().getId() : null);
        m.put("binBarcode", i.getBin() != null ? i.getBin().getBarcode() : null);
        m.put("warehouseName", resolveWarehouseName(i));
        m.put("batchNo", i.getBatchNo());
        m.put("quantity", i.getQuantity());
        m.put("state", i.getState() != null ? i.getState().name() : null);
        m.put("createdAt", i.getCreatedAt());
        m.put("updatedAt", i.getUpdatedAt());
        return m;
    }

    private List<Inventory> filterInventory(List<Inventory> all, String search, String state, String warehouse) {
        final String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        final String normalizedWarehouse = warehouse == null ? "" : warehouse.trim().toLowerCase(Locale.ROOT);

        return all.stream()
                .filter(i -> normalizedSearch.isBlank()
                        || (i.getSku() != null && i.getSku().getSkuCode() != null
                            && i.getSku().getSkuCode().toLowerCase(Locale.ROOT).contains(normalizedSearch))
                        || (i.getBatchNo() != null && i.getBatchNo().toLowerCase(Locale.ROOT).contains(normalizedSearch))
                        || (i.getSerialNo() != null && i.getSerialNo().toLowerCase(Locale.ROOT).contains(normalizedSearch))
                        || (i.getBin() != null && i.getBin().getBarcode() != null
                            && i.getBin().getBarcode().toLowerCase(Locale.ROOT).contains(normalizedSearch)))
                .filter(i -> state == null || state.isBlank() || (i.getState() != null && i.getState().name().equalsIgnoreCase(state)))
                .filter(i -> {
                    if (normalizedWarehouse.isBlank()) return true;
                    String warehouseName = resolveWarehouseName(i).toLowerCase(Locale.ROOT);
                    return warehouseName.contains(normalizedWarehouse);
                })
                .toList();
    }

    private String resolveWarehouseName(Inventory i) {
        if (i == null
                || i.getBin() == null
                || i.getBin().getRack() == null
                || i.getBin().getRack().getAisle() == null
                || i.getBin().getRack().getAisle().getZone() == null
                || i.getBin().getRack().getAisle().getZone().getWarehouse() == null
                || i.getBin().getRack().getAisle().getZone().getWarehouse().getName() == null) {
            return "";
        }
        return i.getBin().getRack().getAisle().getZone().getWarehouse().getName();
    }
}
