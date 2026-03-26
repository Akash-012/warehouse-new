package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.repository.InventoryRepository;
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

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String state,
            @RequestParam(defaultValue = "") String warehouse) {

        List<Inventory> all = inventoryRepository.findAll();

        List<Inventory> filtered = all.stream()
                .filter(i -> search.isBlank()
                        || i.getSku().getSkuCode().toLowerCase().contains(search.toLowerCase())
                        || (i.getBin() != null && i.getBin().getBarcode().toLowerCase().contains(search.toLowerCase())))
                .filter(i -> state.isBlank() || i.getState().name().equalsIgnoreCase(state))
                .toList();

        int total = filtered.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        List<Inventory> paged = filtered.subList(from, to);

        List<Map<String, Object>> items = paged.stream().map(i -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", i.getId());
            m.put("skuCode", i.getSku().getSkuCode());
            m.put("skuName", i.getSku().getDescription());
            m.put("binBarcode", i.getBin() != null ? i.getBin().getBarcode() : null);
            m.put("batchNo", i.getBatchNo());
            m.put("serialNo", i.getSerialNo());
            m.put("quantity", i.getQuantity());
            m.put("state", i.getState().name());
            m.put("createdAt", i.getCreatedAt());
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", items);
        result.put("totalElements", total);
        result.put("totalPages", size > 0 ? (int) Math.ceil((double) total / size) : 0);
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAuthority('INVENTORY_MANAGE')")
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
}
