package com.warehouse.wms.service;

import com.warehouse.wms.dto.PackScanResult;
import com.warehouse.wms.dto.PackingManifest;
import com.warehouse.wms.dto.PackingManifestLine;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.RackCompartment;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.RackCompartmentRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PackingService {

    private final RackCompartmentRepository rackCompartmentRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final InventoryRepository inventoryRepository;

    private final Map<Long, Set<String>> packedBarcodesByOrder = new ConcurrentHashMap<>();

    public PackingManifest startPacking(String trolleyBarcode, String compartmentBarcode) {
        RackCompartment compartment = rackCompartmentRepository.findByCompartmentIdentifier(compartmentBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Compartment not found: " + compartmentBarcode));

        if (compartment.getTrolley() == null || !compartment.getTrolley().getTrolleyIdentifier().equals(trolleyBarcode)) {
            throw new InventoryStateException("Compartment is not assigned to the provided trolley");
        }

        SalesOrder order = Optional.ofNullable(compartment.getSalesOrder())
                .orElseThrow(() -> new InventoryStateException("Compartment is not assigned to any order"));

        List<Inventory> picked = inventoryRepository.findAll().stream()
                .filter(i -> i.getState() == Inventory.InventoryState.PICKED)
                .filter(i -> order.getLines().stream().anyMatch(line -> line.getSku().getId().equals(i.getSku().getId())))
                .toList();

        Map<String, List<Inventory>> grouped = picked.stream().collect(Collectors.groupingBy(i -> i.getSku().getSkuCode()));
        List<PackingManifestLine> lines = grouped.entrySet().stream().map(entry -> PackingManifestLine.builder()
                .skuCode(entry.getKey())
                .expectedQty(entry.getValue().size())
                .itemBarcodes(entry.getValue().stream().map(Inventory::getSerialNo).toList())
                .build()).toList();

        packedBarcodesByOrder.putIfAbsent(order.getId(), ConcurrentHashMap.newKeySet());

        return PackingManifest.builder()
                .orderId(order.getId())
                .lines(lines)
                .build();
    }

    @Transactional
    public PackScanResult scanItem(String itemBarcode, String compartmentBarcode) {
        RackCompartment compartment = rackCompartmentRepository.findByCompartmentIdentifier(compartmentBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Compartment not found: " + compartmentBarcode));
        SalesOrder order = Optional.ofNullable(compartment.getSalesOrder())
                .orElseThrow(() -> new InventoryStateException("Compartment is not assigned to any order"));

        Inventory inventory = inventoryRepository.findBySerialNo(itemBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Inventory not found for item barcode: " + itemBarcode));

        boolean belongsToOrder = order.getLines().stream().anyMatch(line -> line.getSku().getId().equals(inventory.getSku().getId()));
        if (!belongsToOrder) {
            throw new InventoryStateException("Scanned item does not belong to this order");
        }

        Set<String> scanned = packedBarcodesByOrder.computeIfAbsent(order.getId(), id -> ConcurrentHashMap.newKeySet());
        scanned.add(itemBarcode);

        List<Inventory> orderPickedItems = inventoryRepository.findAll().stream()
                .filter(i -> i.getState() == Inventory.InventoryState.PICKED)
                .filter(i -> order.getLines().stream().anyMatch(line -> line.getSku().getId().equals(i.getSku().getId())))
                .toList();

        int remaining = Math.max(orderPickedItems.size() - scanned.size(), 0);
        boolean complete = remaining == 0;

        if (complete) {
            for (Inventory item : orderPickedItems) {
                item.setState(Inventory.InventoryState.PACKED);
                inventoryRepository.save(item);
            }
            order.setStatus("PACKED");
            salesOrderRepository.save(order);
        }

        return PackScanResult.builder()
                .scanned(scanned.size())
                .remaining(remaining)
                .complete(complete)
                .build();
    }

    public PackScanResult getPackingStatus(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + orderId));

        Set<String> scanned = packedBarcodesByOrder.getOrDefault(orderId, Set.of());
        int expected = inventoryRepository.findAll().stream()
                .filter(i -> order.getLines().stream().anyMatch(line -> line.getSku().getId().equals(i.getSku().getId())))
                .filter(i -> i.getState() == Inventory.InventoryState.PICKED || i.getState() == Inventory.InventoryState.PACKED)
                .toList().size();

        int remaining = Math.max(expected - scanned.size(), 0);
        return PackScanResult.builder()
                .scanned(scanned.size())
                .remaining(remaining)
                .complete(remaining == 0 && expected > 0)
                .build();
    }
}
