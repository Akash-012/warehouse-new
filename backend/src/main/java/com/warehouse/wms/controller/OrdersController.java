package com.warehouse.wms.controller;

import com.warehouse.wms.dto.PickTaskResponse;
import com.warehouse.wms.dto.SalesOrderRequest;
import com.warehouse.wms.dto.SalesOrderResponse;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.service.SalesOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ORDERS_VIEW')")
public class OrdersController {

    private final SalesOrderService salesOrderService;
    private final SalesOrderRepository salesOrderRepository;

    @GetMapping
    public List<Map<String, Object>> list() {
        return salesOrderRepository.findAllSummary().stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", row[0]);
            m.put("customerName", row[1]);
            m.put("status", row[2]);
            m.put("createdAt", row[3]);
            m.put("soNumber", row[4]);
            return m;
        }).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ORDERS_CREATE')")
    public ResponseEntity<SalesOrderResponse> create(@Valid @RequestBody SalesOrderRequest request) {
        return ResponseEntity.ok(salesOrderService.createOrder(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return ResponseEntity.ok(salesOrderService.getOrder(id));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('ORDERS_CREATE')")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        salesOrderService.cancelOrder(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pick-tasks")
    public ResponseEntity<List<PickTaskResponse>> pickTasks(@PathVariable Long id) {
        return ResponseEntity.ok(salesOrderService.getOrderPickTasks(id));
    }
}
