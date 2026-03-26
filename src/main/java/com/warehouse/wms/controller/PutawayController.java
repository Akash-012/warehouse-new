package com.warehouse.wms.controller;

import com.warehouse.wms.dto.ExecutionResult;
import com.warehouse.wms.dto.PutawayExecutionRequest;
import com.warehouse.wms.dto.PutawayTaskResponse;
import com.warehouse.wms.entity.PutawayTask;
import com.warehouse.wms.repository.PutawayTaskRepository;
import com.warehouse.wms.service.PutawayEngineService;
import com.warehouse.wms.service.PutawayExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/putaway")
@RequiredArgsConstructor
public class PutawayController {

    private final PutawayEngineService putawayEngineService;
    private final PutawayExecutionService putawayExecutionService;
    private final PutawayTaskRepository putawayTaskRepository;

    @Operation(summary = "Generate putaway tasks from a GRN")
    @PostMapping("/tasks/generate/{grnId}")
    public ResponseEntity<List<PutawayTaskResponse>> generate(@PathVariable Long grnId) {
        return ResponseEntity.ok(putawayEngineService.generatePutawayTasks(grnId));
    }

    @Operation(summary = "Execute putaway scan")
    @PostMapping("/execute")
    public ResponseEntity<ExecutionResult> execute(@Valid @RequestBody PutawayExecutionRequest request) {
        return ResponseEntity.ok(putawayExecutionService.executeScan(request.getItemBarcode(), request.getBinBarcode(), request.getUserId()));
    }

    @Operation(summary = "List pending putaway tasks")
    @GetMapping("/tasks/pending")
    public ResponseEntity<List<PutawayTask>> pending() {
        return ResponseEntity.ok(putawayTaskRepository.findByStatusOrderByPriorityAscIdAsc(PutawayTask.PutawayTaskStatus.PENDING));
    }
}
