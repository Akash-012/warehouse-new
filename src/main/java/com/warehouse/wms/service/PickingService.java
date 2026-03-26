package com.warehouse.wms.service;

import com.warehouse.wms.dto.ExecutionResult;
import com.warehouse.wms.dto.PickScanRequest;
import com.warehouse.wms.dto.PickingStartRequest;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.MovementLog;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.entity.RackCompartment;
import com.warehouse.wms.entity.SkuDimension;
import com.warehouse.wms.entity.Trolley;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.BinRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.MovementLogRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.RackCompartmentRepository;
import com.warehouse.wms.repository.SkuDimensionRepository;
import com.warehouse.wms.repository.TrolleyRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

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

    @Transactional
    public String startPicking(PickingStartRequest request) {
        Trolley trolley = trolleyRepository.findByTrolleyIdentifier(request.getTrolleyBarcode())
                .orElseThrow(() -> new EntityNotFoundException("Trolley not found: " + request.getTrolleyBarcode()));
        RackCompartment compartment = rackCompartmentRepository.findByCompartmentIdentifier(request.getRackCompartmentBarcode())
                .orElseThrow(() -> new EntityNotFoundException("Compartment not found: " + request.getRackCompartmentBarcode()));

        if (compartment.getSalesOrder() != null && !compartment.getSalesOrder().getId().equals(request.getSalesOrderId())) {
            throw new InventoryStateException("Compartment already assigned to another sales order");
        }

        compartment.setTrolley(trolley);
        // sales order assignment happens in TrolleyService assign endpoint
        rackCompartmentRepository.save(compartment);

        return "PICKING_SESSION_STARTED";
    }

    @Transactional
    public ExecutionResult executePick(PickScanRequest request) {
        Inventory inventory = inventoryRepository.findBySerialNo(request.getItemBarcode())
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for barcode: " + request.getItemBarcode()));

        PickTask task = pickTaskRepository.findByInventoryIdAndStatus(inventory.getId(), "PENDING")
                .orElseThrow(() -> new EntityNotFoundException("Pending pick task not found for item"));

        if (task.getBinBarcode() != null && !task.getBinBarcode().equals(request.getBinBarcode())) {
            throw new InventoryStateException("Scanned bin does not match expected pick bin");
        }

        if (task.getSkuCode() != null && !task.getSkuCode().equals(inventory.getSku().getSkuCode())) {
            throw new InventoryStateException("Scanned item does not match expected SKU");
        }

        Trolley trolley = trolleyRepository.findByTrolleyIdentifier(request.getTrolleyBarcode())
                .orElseThrow(() -> new EntityNotFoundException("Trolley not found: " + request.getTrolleyBarcode()));
        RackCompartment compartment = rackCompartmentRepository.findByCompartmentIdentifier(request.getRackCompartmentBarcode())
                .orElseThrow(() -> new EntityNotFoundException("Compartment not found: " + request.getRackCompartmentBarcode()));

        if (compartment.getSalesOrder() == null || !compartment.getSalesOrder().getId().equals(task.getSalesOrderLine().getSalesOrder().getId())) {
            throw new InventoryStateException("Compartment is not assigned to this order");
        }

        if (inventory.getState() != Inventory.InventoryState.RESERVED) {
            throw new InventoryStateException("Inventory must be in RESERVED state for picking");
        }

        Inventory.InventoryState fromState = inventory.getState();
        inventory.setState(Inventory.InventoryState.PICKED);
        inventoryRepository.save(inventory);

        if (inventory.getBin() != null) {
            SkuDimension dimension = skuDimensionRepository.findBySkuId(inventory.getSku().getId())
                    .orElseThrow(() -> new EntityNotFoundException("SKU dimension not found for skuId=" + inventory.getSku().getId()));
            BigDecimal itemVolume = dimension.getLengthCm().multiply(dimension.getWidthCm()).multiply(dimension.getHeightCm());
            BigDecimal itemWeight = dimension.getWeightG();

            BigDecimal currentVolume = inventory.getBin().getOccupiedVolumeCm3() == null ? BigDecimal.ZERO : inventory.getBin().getOccupiedVolumeCm3();
            BigDecimal currentWeight = inventory.getBin().getOccupiedWeightG() == null ? BigDecimal.ZERO : inventory.getBin().getOccupiedWeightG();

            BigDecimal newVolume = currentVolume.subtract(itemVolume);
            BigDecimal newWeight = currentWeight.subtract(itemWeight);
            if (newVolume.compareTo(BigDecimal.ZERO) < 0) {
                newVolume = BigDecimal.ZERO;
            }
            if (newWeight.compareTo(BigDecimal.ZERO) < 0) {
                newWeight = BigDecimal.ZERO;
            }
            inventory.getBin().setOccupiedVolumeCm3(newVolume);
            inventory.getBin().setOccupiedWeightG(newWeight);
            inventory.getBin().setStatus(com.warehouse.wms.entity.Bin.BinStatus.AVAILABLE);
            binRepository.save(inventory.getBin());
        }

        task.setStatus("COMPLETED");
        task.setTrolley(trolley);
        task.setRackCompartment(compartment);
        pickTaskRepository.save(task);

        MovementLog log = new MovementLog();
        log.setInventory(inventory);
        log.setFromState(fromState);
        log.setToState(Inventory.InventoryState.PICKED);
        log.setBin(inventory.getBin());
        log.setAction("PICK_EXECUTED");
        movementLogRepository.save(log);

        return ExecutionResult.builder()
                .success(true)
                .inventoryId(inventory.getId())
                .binBarcode(request.getBinBarcode())
                .newBinStatus(inventory.getBin() != null ? inventory.getBin().getStatus().name() : "N/A")
                .build();
    }

    public List<PickTask> getPendingTasks() {
        return pickTaskRepository.findByStatusOrderByIdAsc("PENDING");
    }
}
