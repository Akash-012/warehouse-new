package com.warehouse.wms.controller;

import com.warehouse.wms.dto.CompartmentContentsResponse;
import com.warehouse.wms.dto.TrolleyAssignRequest;
import com.warehouse.wms.dto.TrolleyCreateRequest;
import com.warehouse.wms.entity.RackCompartment;
import com.warehouse.wms.entity.Trolley;
import com.warehouse.wms.repository.RackCompartmentRepository;
import com.warehouse.wms.service.TrolleyService;
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
@RequestMapping("/api/trolleys")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('TROLLEYS_VIEW')")
public class TrolleyController {

    private final TrolleyService trolleyService;
    private final RackCompartmentRepository rackCompartmentRepository;

    @Operation(summary = "List all trolleys")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        return ResponseEntity.ok(trolleyService.getAllTrolleys().stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("trolleyIdentifier", t.getTrolleyIdentifier());
            List<String> barcodes = rackCompartmentRepository.findByTrolleyId(t.getId())
                    .stream().map(c -> c.getCompartmentIdentifier()).toList();
            m.put("compartments", barcodes);
            m.put("status", "IDLE");
            return m;
        }).toList());
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

    @Operation(summary = "Add compartments to an existing trolley")
    @PostMapping("/{barcode}/compartments")
    @PreAuthorize("hasAuthority('TROLLEYS_CREATE')")
    public ResponseEntity<Map<String, Object>> addCompartments(
            @PathVariable("barcode") String trolleyBarcode,
            @RequestBody Map<String, List<String>> body) {
        List<String> barcodes = body.get("compartmentBarcodes");
        if (barcodes == null || barcodes.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "compartmentBarcodes is required"));
        }
        List<String> added = trolleyService.addCompartments(trolleyBarcode, barcodes);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trolleyBarcode", trolleyBarcode);
        result.put("added", added);
        result.put("count", added.size());
        return ResponseEntity.ok(result);
    }
}
