package com.warehouse.wms.service;

import com.warehouse.wms.dto.ShipmentRequest;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.entity.ShipmentRecord;
import com.warehouse.wms.event.ShipmentConfirmedEvent;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.InventoryRepository;
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
    private final ApplicationEventPublisher applicationEventPublisher;

    @Transactional
    public ShipmentRecord confirmShipment(ShipmentRequest request) {
        SalesOrder order = salesOrderRepository.findDetailedById(request.getOrderId())
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + request.getOrderId()));

        if (!"PACKED".equalsIgnoreCase(order.getStatus())) {
            throw new InventoryStateException("Order must be in PACKED state before shipping");
        }

        List<Long> skuIds = order.getLines().stream().map(line -> line.getSku().getId()).toList();
        List<Inventory> packedItems = inventoryRepository.findAllWithDetails().stream()
                .filter(i -> i.getState() == Inventory.InventoryState.PACKED)
                .filter(i -> skuIds.contains(i.getSku().getId()))
                .toList();

        for (Inventory inventory : packedItems) {
            inventory.setState(Inventory.InventoryState.SHIPPED);
            inventoryRepository.save(inventory);
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
}
