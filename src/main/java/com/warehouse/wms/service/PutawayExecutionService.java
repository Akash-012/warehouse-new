package com.warehouse.wms.service;

import com.warehouse.wms.dto.ExecutionResult;
import com.warehouse.wms.entity.Bin;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.MovementLog;
import com.warehouse.wms.entity.PutawayTask;
import com.warehouse.wms.entity.SkuDimension;
import com.warehouse.wms.entity.User;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.BinRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.MovementLogRepository;
import com.warehouse.wms.repository.PutawayTaskRepository;
import com.warehouse.wms.repository.SkuDimensionRepository;
import com.warehouse.wms.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class PutawayExecutionService {

    private final InventoryRepository inventoryRepository;
    private final PutawayTaskRepository putawayTaskRepository;
    private final BinRepository binRepository;
    private final SkuDimensionRepository skuDimensionRepository;
    private final MovementLogRepository movementLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public ExecutionResult executeScan(String itemBarcode, String binBarcode, Long userId) {
        Inventory inventory = inventoryRepository.findBySerialNo(itemBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for barcode: " + itemBarcode));

        if (inventory.getState() != Inventory.InventoryState.IN_PUTAWAY) {
            throw new InventoryStateException("Inventory state must be IN_PUTAWAY for putaway execution");
        }

        PutawayTask task = putawayTaskRepository
                .findByInventoryIdAndStatus(inventory.getId(), PutawayTask.PutawayTaskStatus.PENDING)
                .orElseThrow(() -> new EntityNotFoundException("Pending putaway task not found for inventory: " + inventory.getId()));

        User actor = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        Bin scannedBin = binRepository.findByBarcode(binBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Bin not found: " + binBarcode));

        String suggestedBarcode = task.getSuggestedBin() != null ? task.getSuggestedBin().getBarcode() : null;
        boolean managerOverride = "WAREHOUSE_MANAGER".equalsIgnoreCase(actor.getRole());
        if (suggestedBarcode != null && !suggestedBarcode.equals(binBarcode) && !managerOverride) {
            throw new InventoryStateException("Scanned bin differs from suggested bin; manager override required");
        }

        SkuDimension dimension = skuDimensionRepository.findBySkuId(inventory.getSku().getId())
                .orElseThrow(() -> new EntityNotFoundException("SKU dimension not found for skuId=" + inventory.getSku().getId()));

        BigDecimal itemVolume = dimension.getLengthCm().multiply(dimension.getWidthCm()).multiply(dimension.getHeightCm());
        BigDecimal itemWeight = dimension.getWeightG();

        BigDecimal freeVolume = scannedBin.getVolumeCm3().subtract(scannedBin.getOccupiedVolumeCm3());
        BigDecimal freeWeight = scannedBin.getMaxWeightG().subtract(scannedBin.getOccupiedWeightG());
        if (freeVolume.compareTo(itemVolume) < 0 || freeWeight.compareTo(itemWeight) < 0) {
            throw new InventoryStateException("Scanned bin does not have enough remaining capacity");
        }

        Inventory.InventoryState fromState = inventory.getState();
        inventory.setBin(scannedBin);
        inventory.setState(Inventory.InventoryState.AVAILABLE);
        inventoryRepository.save(inventory);

        scannedBin.setOccupiedVolumeCm3(scannedBin.getOccupiedVolumeCm3().add(itemVolume));
        scannedBin.setOccupiedWeightG(scannedBin.getOccupiedWeightG().add(itemWeight));
        BigDecimal fillRatio = scannedBin.getOccupiedVolumeCm3().divide(scannedBin.getVolumeCm3(), 4, java.math.RoundingMode.HALF_UP);
        if (fillRatio.compareTo(new BigDecimal("0.95")) >= 0) {
            scannedBin.setStatus(Bin.BinStatus.FULL);
        }
        binRepository.save(scannedBin);

        task.setStatus(PutawayTask.PutawayTaskStatus.COMPLETED);
        putawayTaskRepository.save(task);

        MovementLog log = new MovementLog();
        log.setInventory(inventory);
        log.setFromState(fromState);
        log.setToState(Inventory.InventoryState.AVAILABLE);
        log.setBin(scannedBin);
        log.setUserId(userId);
        log.setAction(managerOverride && suggestedBarcode != null && !suggestedBarcode.equals(binBarcode)
            ? "PUTAWAY_EXECUTED_MANAGER_OVERRIDE"
            : "PUTAWAY_EXECUTED");
        movementLogRepository.save(log);

        return ExecutionResult.builder()
                .success(true)
                .inventoryId(inventory.getId())
                .binBarcode(scannedBin.getBarcode())
                .newBinStatus(scannedBin.getStatus().name())
                .build();
    }
}
