package com.warehouse.wms.controller;

import com.warehouse.wms.dto.ExecutionResult;
import com.warehouse.wms.dto.PickScanRequest;
import com.warehouse.wms.dto.PickingSessionResponse;
import com.warehouse.wms.dto.PickingStartRequest;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.service.PickingService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/picking")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PICKING_VIEW')")
public class PickingController {

    private final PickingService pickingService;

    @Operation(summary = "Start picking session")
    @PostMapping("/start")
    public ResponseEntity<PickingSessionResponse> start(@Valid @RequestBody PickingStartRequest request) {
        return ResponseEntity.ok(pickingService.startPicking(request));
    }

    @Operation(summary = "Execute pick scan")
    @PostMapping("/scan")
    public ResponseEntity<ExecutionResult> scan(@Valid @RequestBody PickScanRequest request) {
        return ResponseEntity.ok(pickingService.executePick(request));
    }

    @Operation(summary = "List pending pick tasks")
    @GetMapping("/tasks/pending")
    public ResponseEntity<List<PickTask>> pendingTasks() {
        return ResponseEntity.ok(pickingService.getPendingTasks());
    }
}
