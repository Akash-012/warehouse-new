package com.warehouse.wms.service;

import com.warehouse.wms.dto.PackScanResult;
import com.warehouse.wms.dto.PackingManifest;
import com.warehouse.wms.dto.PackingManifestLine;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.MovementLog;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.MovementLogRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PackingService {

    private final SalesOrderRepository salesOrderRepository;
    private final InventoryRepository inventoryRepository;
    private final PickTaskRepository pickTaskRepository;
    private final MovementLogRepository movementLogRepository;

    /** Returns packing manifest for an order — all PICKED inventory items for this order. */
    @Transactional
    public PackingManifest getManifestByOrder(Long orderId) {
        SalesOrder order = salesOrderRepository.findDetailedById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + orderId));

        if (!List.of("PICKED", "PACKING").contains(order.getStatus())) {
            throw new InventoryStateException("Order must be in PICKED state to start packing, current: " + order.getStatus());
        }

        // Advance to PACKING
        if ("PICKED".equals(order.getStatus())) {
            order.setStatus("PACKING");
            salesOrderRepository.save(order);
        }

        // Get inventory items that belong to this order via pick tasks
        List<Inventory> pickedItems = getOrderPickedInventory(orderId);

        Map<String, List<Inventory>> grouped = pickedItems.stream()
                .collect(Collectors.groupingBy(i -> i.getSku().getSkuCode()));

        List<PackingManifestLine> lines = grouped.entrySet().stream()
                .map(e -> PackingManifestLine.builder()
                        .skuCode(e.getKey())
                        .expectedQty(e.getValue().size())
                        .itemBarcodes(e.getValue().stream().map(Inventory::getSerialNo).toList())
                        .build())
                .toList();

        return PackingManifest.builder()
                .orderId(orderId)
                .customerName(order.getCustomerName())
                .lines(lines)
                .build();
    }

    @Transactional
    public PackScanResult scanItem(String itemBarcode, Long orderId) {
        SalesOrder order = salesOrderRepository.findDetailedById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + orderId));

        Inventory inventory = inventoryRepository.findBySerialNo(itemBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for barcode: " + itemBarcode));

        // Verify item belongs to this order via pick tasks
        boolean belongsToOrder = pickTaskRepository.findBySalesOrderLineSalesOrderId(orderId)
                .stream().anyMatch(t -> t.getInventory().getId().equals(inventory.getId()));
        if (!belongsToOrder) {
            throw new InventoryStateException("Scanned item does not belong to order #" + orderId);
        }

        if (inventory.getState() != Inventory.InventoryState.PICKED) {
            throw new InventoryStateException("Item must be in PICKED state to pack, current: " + inventory.getState());
        }

        Inventory.InventoryState fromState = inventory.getState();
        inventory.setState(Inventory.InventoryState.PACKED);
        inventoryRepository.save(inventory);

        MovementLog log = new MovementLog();
        log.setInventory(inventory);
        log.setFromState(fromState);
        log.setToState(Inventory.InventoryState.PACKED);
        log.setAction("PACK_EXECUTED");
        movementLogRepository.save(log);

        // Check if all items for this order are now packed
        List<Inventory> orderItems = getOrderPickedInventory(orderId);
        long stillPicked = orderItems.stream().filter(i -> i.getState() == Inventory.InventoryState.PICKED).count();
        long packed      = orderItems.stream().filter(i -> i.getState() == Inventory.InventoryState.PACKED).count()
                         + (inventory.getState() == Inventory.InventoryState.PACKED ? 0 : 1); // already counted above

        // Re-query to get accurate counts after save
        List<Inventory> refreshed = getOrderInventoryByState(orderId, Inventory.InventoryState.PICKED);
        boolean complete = refreshed.isEmpty();

        if (complete) {
            order.setStatus("PACKED");
            salesOrderRepository.save(order);
        }

        int totalItems = getOrderPickedAndPackedCount(orderId);
        int remaining  = (int) refreshed.size();

        return PackScanResult.builder()
                .scanned(totalItems - remaining)
                .remaining(remaining)
                .complete(complete)
                .build();
    }

    public PackScanResult getPackingStatus(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + orderId));

        int picked = getOrderInventoryByState(orderId, Inventory.InventoryState.PICKED).size();
        int packed  = getOrderInventoryByState(orderId, Inventory.InventoryState.PACKED).size();
        int total   = picked + packed;

        return PackScanResult.builder()
                .scanned(packed)
                .remaining(picked)
                .complete(picked == 0 && packed > 0)
                .build();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<Inventory> getOrderPickedInventory(Long orderId) {
        return pickTaskRepository.findBySalesOrderLineSalesOrderId(orderId).stream()
                .map(PickTask::getInventory)
                .filter(i -> i.getState() == Inventory.InventoryState.PICKED
                          || i.getState() == Inventory.InventoryState.PACKED)
                .toList();
    }

    private List<Inventory> getOrderInventoryByState(Long orderId, Inventory.InventoryState state) {
        return pickTaskRepository.findBySalesOrderLineSalesOrderId(orderId).stream()
                .map(PickTask::getInventory)
                // Re-fetch to get latest state
                .map(i -> inventoryRepository.findById(i.getId()).orElse(i))
                .filter(i -> i.getState() == state)
                .toList();
    }

    private int getOrderPickedAndPackedCount(Long orderId) {
        return (int) pickTaskRepository.findBySalesOrderLineSalesOrderId(orderId).stream()
                .map(PickTask::getInventory)
                .map(i -> inventoryRepository.findById(i.getId()).orElse(i))
                .filter(i -> i.getState() == Inventory.InventoryState.PICKED
                          || i.getState() == Inventory.InventoryState.PACKED)
                .count();
    }
}
