package com.warehouse.wms.service;

import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.MovementLog;
import com.warehouse.wms.event.ShipmentConfirmedEvent;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.MovementLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShipmentNotificationListener {

    private final InventoryRepository inventoryRepository;
    private final MovementLogRepository movementLogRepository;

    @Async
    @EventListener
    public void onShipmentConfirmed(ShipmentConfirmedEvent event) {
        log.info("Shipment confirmed for orderId={}, awb={}, courier={}", event.getOrderId(), event.getAwbNumber(), event.getCourierName());

        inventoryRepository.findAll().stream()
                .filter(inv -> inv.getState() == Inventory.InventoryState.SHIPPED)
                .forEach(inv -> {
                    MovementLog movementLog = new MovementLog();
                    movementLog.setInventory(inv);
                    movementLog.setFromState(Inventory.InventoryState.PACKED);
                    movementLog.setToState(Inventory.InventoryState.SHIPPED);
                    movementLog.setBin(inv.getBin());
                    movementLog.setAction("SHIPMENT_CONFIRMED_EVENT");
                    movementLogRepository.save(movementLog);
                });
    }
}
