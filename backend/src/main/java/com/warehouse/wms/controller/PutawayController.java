package com.warehouse.wms.controller;

import com.warehouse.wms.dto.ExecutionResult;
import com.warehouse.wms.dto.PutawayExecutionRequest;
import com.warehouse.wms.dto.PutawayTaskResponse;
import com.warehouse.wms.entity.PutawayTask;
import com.warehouse.wms.entity.User;
import com.warehouse.wms.repository.PutawayTaskRepository;
import com.warehouse.wms.repository.UserRepository;
import com.warehouse.wms.service.PutawayEngineService;
import com.warehouse.wms.service.PutawayExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/putaway")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PUTAWAY_VIEW')")
public class PutawayController {

    private final PutawayEngineService putawayEngineService;
    private final PutawayExecutionService putawayExecutionService;
    private final PutawayTaskRepository putawayTaskRepository;
    private final UserRepository userRepository;

    @Operation(summary = "Generate putaway tasks from a GRN")
    @PostMapping("/tasks/generate/{grnId}")
    public ResponseEntity<List<PutawayTaskResponse>> generate(@PathVariable Long grnId) {
        return ResponseEntity.ok(putawayEngineService.generatePutawayTasks(grnId));
    }

    @Operation(summary = "Execute putaway scan")
    @PostMapping("/execute")
    public ResponseEntity<ExecutionResult> execute(
            @Valid @RequestBody PutawayExecutionRequest request,
            Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + authentication.getName()));
        return ResponseEntity.ok(putawayExecutionService.executeScan(
                request.getItemBarcode(), request.getBinBarcode(), user.getId()));
    }

    @Operation(summary = "List pending putaway tasks")
    @GetMapping("/tasks/pending")
    public ResponseEntity<List<PutawayTaskResponse>> pending() {
        return ResponseEntity.ok(
            putawayTaskRepository.findByStatusOrderByPriorityAscIdAsc(PutawayTask.PutawayTaskStatus.PENDING)
                .stream()
                .map(t -> {
                        var inv = t.getInventory();
                        var grl = inv.getGoodsReceiptLine();
                        var gr  = grl != null ? grl.getGoodsReceipt() : null;
                        var po  = gr  != null ? gr.getPurchaseOrder() : null;
                        return PutawayTaskResponse.builder()
                                .taskId(t.getId())
                                .inventoryId(inv.getId())
                                .itemBarcode(inv.getSerialNo() != null ? inv.getSerialNo() : inv.getBatchNo())
                                .suggestedBinBarcode(t.getSuggestedBin() != null ? t.getSuggestedBin().getBarcode() : null)
                                .priority(t.getPriority())
                                .state(t.getStatus().name())
                                .skuCode(inv.getSku().getSkuCode())
                                .skuName(inv.getSku().getDescription())
                                .grnNo(gr  != null ? gr.getGrnNo()    : null)
                                .poNumber(po != null ? po.getPoNumber() : null)
                                .build();
                })
                .toList()
        );
    }
}
