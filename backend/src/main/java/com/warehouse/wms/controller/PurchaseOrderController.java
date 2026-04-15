package com.warehouse.wms.controller;

import com.warehouse.wms.dto.CreatePORequest;
import com.warehouse.wms.dto.POResponse;
import com.warehouse.wms.dto.UpdatePORequest;
import com.warehouse.wms.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('INBOUND_VIEW')")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @PostMapping
    @PreAuthorize("hasAuthority('INBOUND_RECEIVE')")
    public ResponseEntity<POResponse> create(@Valid @RequestBody CreatePORequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(purchaseOrderService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<POResponse>> list() {
        return ResponseEntity.ok(purchaseOrderService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<POResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseOrderService.getById(id));
    }

    /**
     * Edit a PO — only allowed when status is PENDING or OPEN.
     * Editable: supplier, expectedArrivalDate, priority, line quantities, add new lines.
     */
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('INBOUND_RECEIVE')")
    public ResponseEntity<POResponse> update(@PathVariable Long id,
                                             @Valid @RequestBody UpdatePORequest request) {
        return ResponseEntity.ok(purchaseOrderService.update(id, request));
    }
}
