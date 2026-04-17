package com.warehouse.wms.controller;

import com.warehouse.wms.dto.ShipmentRequest;
import com.warehouse.wms.entity.ShipmentRecord;
import com.warehouse.wms.service.ShippingService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('SHIPPING_VIEW')")
public class ShippingController {

    private final ShippingService shippingService;

    @Operation(summary = "Confirm shipment")
    @PostMapping("/confirm")
    @PreAuthorize("hasAuthority('SHIPPING_CONFIRM')")
    public ResponseEntity<Map<String, Object>> confirm(@Valid @RequestBody ShipmentRequest request) {
        ShipmentRecord r = shippingService.confirmShipment(request);
        return ResponseEntity.ok(toMap(r));
    }

    @Operation(summary = "Get shipment by order")
    @GetMapping("/{orderId}")
    public ResponseEntity<Map<String, Object>> getByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(toMap(shippingService.getShipmentByOrderId(orderId)));
    }

    @Operation(summary = "List all shipments")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(shippingService.listAll().stream().map(this::toMap).toList());
    }

    private Map<String, Object> toMap(ShipmentRecord r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          r.getId());
        m.put("orderId",     r.getSalesOrder().getId());
        m.put("soNumber",    r.getSalesOrder().getSoNumber());
        m.put("customerName", r.getSalesOrder().getCustomerName());
        m.put("awbNumber",   r.getAwbNumber());
        m.put("courierName", r.getCourierName());
        m.put("status",      "SHIPPED");
        m.put("shippedAt",   r.getCreatedAt());
        return m;
    }
}
