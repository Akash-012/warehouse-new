package com.warehouse.wms.controller;

import com.warehouse.wms.dto.CompartmentContentsResponse;
import com.warehouse.wms.dto.TrolleyAssignRequest;
import com.warehouse.wms.dto.TrolleyCreateRequest;
import com.warehouse.wms.entity.RackCompartment;
import com.warehouse.wms.entity.Trolley;
import com.warehouse.wms.service.TrolleyService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trolleys")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('TROLLEYS_VIEW')")
public class TrolleyController {

    private final TrolleyService trolleyService;

    @Operation(summary = "List all trolleys")
    @GetMapping
    public ResponseEntity<List<Trolley>> getAll() {
        return ResponseEntity.ok(trolleyService.getAllTrolleys());
    }

    @Operation(summary = "Create trolley and bind compartments")
    @PostMapping
    public ResponseEntity<Trolley> create(@Valid @RequestBody TrolleyCreateRequest request) {
        return ResponseEntity.ok(trolleyService.createTrolley(request));
    }

    @Operation(summary = "Assign compartment to sales order")
    @PostMapping("/assign")
    public ResponseEntity<RackCompartment> assign(@Valid @RequestBody TrolleyAssignRequest request) {
        return ResponseEntity.ok(trolleyService.assignCompartmentToOrder(request));
    }

    @Operation(summary = "Get compartment contents")
    @GetMapping("/{barcode}/compartments")
    public ResponseEntity<List<CompartmentContentsResponse>> getContents(@PathVariable("barcode") String trolleyBarcode) {
        return ResponseEntity.ok(trolleyService.getTrolleyCompartmentContents(trolleyBarcode));
    }
}
