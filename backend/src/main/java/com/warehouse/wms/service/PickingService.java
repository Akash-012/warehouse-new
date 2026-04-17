package com.warehouse.wms.service;

import com.warehouse.wms.dto.ExecutionResult;
import com.warehouse.wms.dto.PickScanRequest;
import com.warehouse.wms.dto.PickTaskResponse;
import com.warehouse.wms.dto.PickingSessionResponse;
import com.warehouse.wms.dto.PickingStartRequest;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.MovementLog;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.entity.RackCompartment;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.entity.SkuDimension;
import com.warehouse.wms.entity.Trolley;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.BinRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.MovementLogRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.RackCompartmentRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.SkuDimensionRepository;
import com.warehouse.wms.repository.TrolleyRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PickingService {

    private final TrolleyRepository trolleyRepository;
    private final RackCompartmentRepository rackCompartmentRepository;
    private final PickTaskRepository pickTaskRepository;
    private final InventoryRepository inventoryRepository;
    private final MovementLogRepository movementLogRepository;
    private final BinRepository binRepository;
    private final SkuDimensionRepository skuDimensionRepository;
    private final SalesOrderRepository salesOrderRepository;

    @Transactional
    public PickingSessionResponse startPicking(PickingStartRequest request) {
        if (request.getTrolleyBarcode() != null && request.getRackCompartmentBarcode() != null) {
            Optional<Trolley> trolleyOpt = trolleyRepository.findByTrolleyIdentifier(request.getTrolleyBarcode());
            Optional<RackCompartment> compartmentOpt = rackCompartmentRepository
                    .findByCompartmentIdentifier(request.getRackCompartmentBarcode());
            if (trolleyOpt.isPresent() && compartmentOpt.isPresent()) {
                RackCompartment compartment = compartmentOpt.get();
                compartment.setTrolley(trolleyOpt.get());
                rackCompartmentRepository.save(compartment);
            }
        }

        List<PickTask> tasks = pickTaskRepository.findBySalesOrderLineSalesOrderId(request.getSalesOrderId())
                .stream()
                .filter(t -> "PENDING".equals(t.getStatus()))
                .toList();

        List<PickingSessionResponse.PickingSessionItem> items = tasks.stream()
                .map(t -> PickingSessionResponse.PickingSessionItem.builder()
                        .barcode(t.getInventory().getSerialNo())
                        .sku(t.getSkuCode())
                        .skuCode(t.getSkuCode())
                        .taskId(t.getId())
                        .build())
                .toList();

        return PickingSessionResponse.builder()
                .orderId(request.getSalesOrderId())
                .items(items)
                .build();
    }

    @Transactional
    public ExecutionResult executePick(PickScanRequest request) {
        Inventory inventory = inventoryRepository.findBySerialNo(request.getItemBarcode())
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for barcode: " + request.getItemBarcode()));

        PickTask task = pickTaskRepository.findByInventoryIdAndStatus(inventory.getId(), "PENDING")
                .orElseThrow(() -> new EntityNotFoundException("Pending pick task not found for item"));

        if (task.getBinBarcode() != null && request.getBinBarcode() != null
                && !task.getBinBarcode().equals(request.getBinBarcode())) {
            throw new InventoryStateException("Scanned bin does not match expected pick bin");
        }

        if (task.getSkuCode() != null && !task.getSkuCode().equals(inventory.getSku().getSkuCode())) {
            throw new InventoryStateException("Scanned item does not match expected SKU");
        }

        if (inventory.getState() != Inventory.InventoryState.RESERVED) {
            throw new InventoryStateException("Inventory must be in RESERVED state for picking, current: " + inventory.getState());
        }

        Trolley trolley = null;
        RackCompartment compartment = null;
        if (request.getTrolleyBarcode() != null) {
            trolley = trolleyRepository.findByTrolleyIdentifier(request.getTrolleyBarcode()).orElse(null);
        }
        if (request.getRackCompartmentBarcode() != null) {
            compartment = rackCompartmentRepository
                    .findByCompartmentIdentifier(request.getRackCompartmentBarcode()).orElse(null);
        }

        Inventory.InventoryState fromState = inventory.getState();
        inventory.setState(Inventory.InventoryState.PICKED);
        inventoryRepository.save(inventory);

        // Free bin capacity
        if (inventory.getBin() != null) {
            skuDimensionRepository.findBySkuId(inventory.getSku().getId()).ifPresent(dim -> {
                BigDecimal vol = dim.getLengthCm().multiply(dim.getWidthCm()).multiply(dim.getHeightCm());
                BigDecimal wt  = dim.getWeightG();
                BigDecimal curVol = Optional.ofNullable(inventory.getBin().getOccupiedVolumeCm3()).orElse(BigDecimal.ZERO);
                BigDecimal curWt  = Optional.ofNullable(inventory.getBin().getOccupiedWeightG()).orElse(BigDecimal.ZERO);
                inventory.getBin().setOccupiedVolumeCm3(curVol.subtract(vol).max(BigDecimal.ZERO));
                inventory.getBin().setOccupiedWeightG(curWt.subtract(wt).max(BigDecimal.ZERO));
                inventory.getBin().setStatus(com.warehouse.wms.entity.Bin.BinStatus.AVAILABLE);
                binRepository.save(inventory.getBin());
            });
        }

        task.setStatus("COMPLETED");
        if (trolley != null) task.setTrolley(trolley);
        if (compartment != null) task.setRackCompartment(compartment);
        pickTaskRepository.save(task);

        MovementLog log = new MovementLog();
        log.setInventory(inventory);
        log.setFromState(fromState);
        log.setToState(Inventory.InventoryState.PICKED);
        log.setBin(inventory.getBin());
        log.setAction("PICK_EXECUTED");
        movementLogRepository.save(log);

        // Advance order to PICKED if all tasks for this order are now complete
        Long orderId = task.getSalesOrderLine().getSalesOrder().getId();
        List<PickTask> allOrderTasks = pickTaskRepository.findBySalesOrderLineSalesOrderId(orderId);
        boolean allDone = allOrderTasks.stream().noneMatch(t -> "PENDING".equals(t.getStatus()));
        if (allDone) {
            salesOrderRepository.findById(orderId).ifPresent(order -> {
                order.setStatus("PICKED");
                salesOrderRepository.save(order);
            });
        }

        return ExecutionResult.builder()
                .success(true)
                .inventoryId(inventory.getId())
                .itemBarcode(request.getItemBarcode())
                .binBarcode(task.getBinBarcode())
                .newBinStatus(inventory.getBin() != null ? inventory.getBin().getStatus().name() : "N/A")
                .build();
    }

    public List<PickTaskResponse> getPendingTasks() {
        return pickTaskRepository.findByStatusOrderByIdAsc("PENDING").stream()
                .map(t -> PickTaskResponse.builder()
                        .id(t.getId())
                        .salesOrderLineId(t.getSalesOrderLine().getId())
                        .inventoryId(t.getInventory().getId())
                        .skuCode(t.getSkuCode())
                        .binBarcode(t.getBinBarcode())
                        .quantity(t.getQuantityToPick())
                        .state(t.getStatus())
                        .status(t.getStatus())
                        .orderId(t.getSalesOrderLine().getSalesOrder().getId())
                        .soNumber(t.getSalesOrderLine().getSalesOrder().getSoNumber())
                        .build())
                .toList();
    }
}
