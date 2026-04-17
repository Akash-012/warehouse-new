package com.warehouse.wms.service;

import com.warehouse.wms.dto.ShipmentRequest;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.MovementLog;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.entity.ShipmentRecord;
import com.warehouse.wms.event.ShipmentConfirmedEvent;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.MovementLogRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.ShipmentRecordRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShippingService {

    private final SalesOrderRepository salesOrderRepository;
    private final InventoryRepository inventoryRepository;
    private final ShipmentRecordRepository shipmentRecordRepository;
    private final PickTaskRepository pickTaskRepository;
    private final MovementLogRepository movementLogRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Transactional
    public ShipmentRecord confirmShipment(ShipmentRequest request) {
        SalesOrder order = salesOrderRepository.findDetailedById(request.getOrderId())
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + request.getOrderId()));

        if (!List.of("PACKED", "PACKING").contains(order.getStatus())) {
            throw new InventoryStateException("Order must be in PACKED state before shipping, current: " + order.getStatus());
        }

        // Use pick tasks to identify exact inventory items for this order — avoids cross-order contamination
        List<Inventory> packedItems = pickTaskRepository.findBySalesOrderLineSalesOrderId(order.getId())
                .stream()
                .map(PickTask::getInventory)
                .map(i -> inventoryRepository.findById(i.getId()).orElse(i))
                .filter(i -> i.getState() == Inventory.InventoryState.PACKED)
                .toList();

        if (packedItems.isEmpty()) {
            throw new InventoryStateException("No packed items found for order #" + order.getId() + ". Complete packing first.");
        }

        for (Inventory inventory : packedItems) {
            Inventory.InventoryState fromState = inventory.getState();
            inventory.setState(Inventory.InventoryState.SHIPPED);
            inventoryRepository.save(inventory);

            MovementLog log = new MovementLog();
            log.setInventory(inventory);
            log.setFromState(fromState);
            log.setToState(Inventory.InventoryState.SHIPPED);
            log.setAction("SHIPPED");
            movementLogRepository.save(log);
        }

        order.setStatus("SHIPPED");
        salesOrderRepository.save(order);

        ShipmentRecord record = new ShipmentRecord();
        record.setSalesOrder(order);
        record.setAwbNumber(request.getAwbNumber());
        record.setCourierName(request.getCourierName());
        ShipmentRecord saved = shipmentRecordRepository.save(record);

        applicationEventPublisher.publishEvent(
                new ShipmentConfirmedEvent(this, order.getId(), request.getAwbNumber(), request.getCourierName())
        );

        return saved;
    }

    public ShipmentRecord getShipmentByOrderId(Long orderId) {
        return shipmentRecordRepository.findBySalesOrderId(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Shipment record not found for orderId=" + orderId));
    }

    public List<ShipmentRecord> listAll() {
        return shipmentRecordRepository.findAll();
    }
}
