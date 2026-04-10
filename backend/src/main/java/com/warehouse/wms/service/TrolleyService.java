package com.warehouse.wms.service;

import com.warehouse.wms.dto.CompartmentContentsResponse;
import com.warehouse.wms.dto.TrolleyAssignRequest;
import com.warehouse.wms.dto.TrolleyCreateRequest;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.entity.Rack;
import com.warehouse.wms.entity.RackCompartment;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.entity.Trolley;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.RackCompartmentRepository;
import com.warehouse.wms.repository.RackRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.TrolleyRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TrolleyService {

    private final TrolleyRepository trolleyRepository;
    private final RackCompartmentRepository rackCompartmentRepository;
    private final RackRepository rackRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final PickTaskRepository pickTaskRepository;

    public List<Trolley> getAllTrolleys() {
        return trolleyRepository.findAll();
    }

    @Transactional
    public Trolley createTrolley(TrolleyCreateRequest request) {
        Trolley trolley = trolleyRepository.findByTrolleyIdentifier(request.getTrolleyBarcode())
                .orElseGet(() -> {
                    Trolley t = new Trolley();
                    t.setTrolleyIdentifier(request.getTrolleyBarcode());
                    return trolleyRepository.save(t);
                });

        // Use first available rack as default for auto-created compartments
        Rack defaultRack = rackRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new EntityNotFoundException("No racks found — seed warehouse structure first"));

        for (String compartmentBarcode : request.getCompartmentBarcodes()) {
            RackCompartment compartment = rackCompartmentRepository
                    .findByCompartmentIdentifier(compartmentBarcode)
                    .orElseGet(() -> {
                        // Parse rack from barcode format COMP-{rackId}-{seq}, else use default rack
                        Rack rack = resolveRackFromBarcode(compartmentBarcode, defaultRack);
                        RackCompartment c = new RackCompartment();
                        c.setCompartmentIdentifier(compartmentBarcode);
                        c.setRack(rack);
                        return rackCompartmentRepository.save(c);
                    });
            compartment.setTrolley(trolley);
            rackCompartmentRepository.save(compartment);
        }

        return trolley;
    }

    /**
     * Tries to resolve a Rack from a barcode like COMP-A1R1-01.
     * Format: COMP-{aisleNumber}{rackIdentifier}-{seq} e.g. COMP-A1R1-01 → rack identifier "A1-R1".
     * Falls back to defaultRack if no match found.
     */
    private Rack resolveRackFromBarcode(String barcode, Rack defaultRack) {
        // barcode: COMP-A1R1-01 → middle segment is A1R1 → rack identifier A1-R1
        try {
            String[] parts = barcode.split("-");
            if (parts.length >= 3) {
                // parts[1] = "A1R1", convert to "A1-R1"
                String mid = parts[1]; // e.g. A1R1
                // Insert dash before R: A1R1 → A1-R1
                String rackId = mid.replaceAll("([A-Z]\\d+)([A-Z]\\d+)", "$1-$2");
                return rackRepository.findAll().stream()
                        .filter(r -> r.getRackIdentifier().equalsIgnoreCase(rackId))
                        .findFirst()
                        .orElse(defaultRack);
            }
        } catch (Exception ignored) {}
        return defaultRack;
    }

    @Transactional
    public RackCompartment assignCompartmentToOrder(TrolleyAssignRequest request) {
        RackCompartment compartment = rackCompartmentRepository.findByCompartmentIdentifier(request.getCompartmentBarcode())
                .orElseThrow(() -> new EntityNotFoundException("Compartment not found: " + request.getCompartmentBarcode()));

        if (compartment.getSalesOrder() != null && !compartment.getSalesOrder().getId().equals(request.getSalesOrderId())) {
            throw new InventoryStateException("Compartment is already assigned to another order");
        }

        SalesOrder order = salesOrderRepository.findById(request.getSalesOrderId())
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + request.getSalesOrderId()));

        compartment.setSalesOrder(order);
        return rackCompartmentRepository.save(compartment);
    }

    public CompartmentContentsResponse getCompartmentContents(String compartmentBarcode) {
        RackCompartment compartment = rackCompartmentRepository.findByCompartmentIdentifier(compartmentBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Compartment not found: " + compartmentBarcode));

        if (compartment.getSalesOrder() == null) {
            return CompartmentContentsResponse.builder()
                    .compartmentBarcode(compartmentBarcode)
                    .salesOrderId(null)
                    .orderNumber(null)
                    .pickedItemBarcodes(List.of())
                    .status("EMPTY")
                    .build();
        }

        List<String> pickedItems = pickTaskRepository.findBySalesOrderLineSalesOrderId(compartment.getSalesOrder().getId()).stream()
                .filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .map(PickTask::getInventory)
                .map(inv -> inv.getSerialNo())
                .toList();

        String status = pickedItems.isEmpty() ? "ASSIGNED" : "IN_USE";

        return CompartmentContentsResponse.builder()
                .compartmentBarcode(compartmentBarcode)
                .salesOrderId(compartment.getSalesOrder().getId())
                .orderNumber(compartment.getSalesOrder().getSoNumber())
                .pickedItemBarcodes(pickedItems)
                .status(status)
                .build();
    }

    public List<CompartmentContentsResponse> getTrolleyCompartmentContents(String trolleyBarcode) {
        Trolley trolley = trolleyRepository.findByTrolleyIdentifier(trolleyBarcode)
                .orElseThrow(() -> new EntityNotFoundException("Trolley not found: " + trolleyBarcode));

        return rackCompartmentRepository.findByTrolleyId(trolley.getId()).stream()
                .map(compartment -> getCompartmentContents(compartment.getCompartmentIdentifier()))
                .toList();
    }
}
