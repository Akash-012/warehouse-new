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

@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('SHIPPING_VIEW')")
public class ShippingController {

    private final ShippingService shippingService;

    @Operation(summary = "Confirm shipment")
    @PostMapping("/confirm")
    public ResponseEntity<ShipmentRecord> confirm(@Valid @RequestBody ShipmentRequest request) {
        return ResponseEntity.ok(shippingService.confirmShipment(request));
    }

    @Operation(summary = "Get shipment by order")
    @GetMapping("/{orderId}")
    public ResponseEntity<ShipmentRecord> getByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(shippingService.getShipmentByOrderId(orderId));
    }
}
