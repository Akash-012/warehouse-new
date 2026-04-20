package com.warehouse.wms.controller;

import com.warehouse.wms.dto.GRNResponse;
import com.warehouse.wms.dto.ReceivePOLineRequest;
import com.warehouse.wms.dto.ReceivePORequest;
import com.warehouse.wms.service.InboundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inbound")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('INBOUND_VIEW')")
public class InboundController {

    private final InboundService inboundService;

    @PostMapping("/receive")
    @PreAuthorize("hasAuthority('INBOUND_RECEIVE')")
    public ResponseEntity<GRNResponse> receivePO(@Valid @RequestBody ReceivePORequest request) {
        return ResponseEntity.ok(inboundService.receivePO(request));
    }

    @GetMapping("/grn/{id}/item-barcodes")
    public ResponseEntity<List<Map<String, Object>>> getGrnItemBarcodes(@PathVariable Long id) {
        return ResponseEntity.ok(inboundService.getGrnItemBarcodes(id));
    }

    @GetMapping("/grns")
    public ResponseEntity<List<GRNResponse>> listGRNs() {
        return ResponseEntity.ok(inboundService.listAllGRNs());
    }

    @GetMapping("/grn/{id}")
    public ResponseEntity<GRNResponse> getGRN(@PathVariable Long id) {
        return ResponseEntity.ok(inboundService.getGRN(id));
    }

    @GetMapping("/po/{id}/receive-lines")
    public ResponseEntity<List<Map<String, Object>>> getReceiveLines(@PathVariable Long id) {
        return ResponseEntity.ok(inboundService.buildReceiveLines(id));
    }
}
