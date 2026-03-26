package com.warehouse.wms.controller;

import com.warehouse.wms.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
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
}
