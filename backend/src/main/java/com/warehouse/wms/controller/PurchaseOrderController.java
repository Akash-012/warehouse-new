package com.warehouse.wms.controller;

import com.warehouse.wms.repository.PurchaseOrderRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('INBOUND_VIEW')")
public class PurchaseOrderController {

    private final PurchaseOrderRepository purchaseOrderRepository;

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
