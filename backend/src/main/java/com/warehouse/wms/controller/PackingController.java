package com.warehouse.wms.controller;

import com.warehouse.wms.dto.PackScanResult;
import com.warehouse.wms.dto.PackingManifest;
import com.warehouse.wms.dto.PackingScanRequest;
import com.warehouse.wms.service.PackingService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/packing")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PACKING_VIEW')")
public class PackingController {

    private final PackingService packingService;

    @Operation(summary = "Start packing and fetch manifest")
    @PostMapping("/start")
    public ResponseEntity<PackingManifest> startPacking(@RequestParam String trolleyBarcode,
                                                        @RequestParam String compartmentBarcode) {
        return ResponseEntity.ok(packingService.startPacking(trolleyBarcode, compartmentBarcode));
    }

    @Operation(summary = "Scan packed item")
    @PostMapping("/scan")
    public ResponseEntity<PackScanResult> scanItem(@Valid @RequestBody PackingScanRequest request) {
        return ResponseEntity.ok(packingService.scanItem(request.getItemBarcode(), request.getCompartmentBarcode()));
    }

    @Operation(summary = "Get packing status for order")
    @GetMapping("/status/{orderId}")
    public ResponseEntity<PackScanResult> status(@PathVariable Long orderId) {
        return ResponseEntity.ok(packingService.getPackingStatus(orderId));
    }
}
