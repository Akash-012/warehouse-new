package com.warehouse.wms.service;

import com.warehouse.wms.dto.CompartmentContentsResponse;
import com.warehouse.wms.dto.TrolleyAssignRequest;
import com.warehouse.wms.dto.TrolleyCreateRequest;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.entity.RackCompartment;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.entity.Trolley;
import com.warehouse.wms.exception.InventoryStateException;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.RackCompartmentRepository;
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
    private final SalesOrderRepository salesOrderRepository;
    private final PickTaskRepository pickTaskRepository;

    @Transactional
    public Trolley createTrolley(TrolleyCreateRequest request) {
        Trolley trolley = trolleyRepository.findByTrolleyIdentifier(request.getTrolleyBarcode())
                .orElseGet(() -> {
                    Trolley t = new Trolley();
                    t.setTrolleyIdentifier(request.getTrolleyBarcode());
                    return trolleyRepository.save(t);
                });

        for (String compartmentBarcode : request.getCompartmentBarcodes()) {
            RackCompartment compartment = rackCompartmentRepository.findByCompartmentIdentifier(compartmentBarcode)
                    .orElseThrow(() -> new EntityNotFoundException("Compartment not found: " + compartmentBarcode));
            compartment.setTrolley(trolley);
            rackCompartmentRepository.save(compartment);
        }

        return trolley;
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
                    .build();
        }

        List<String> pickedItems = pickTaskRepository.findBySalesOrderLineSalesOrderId(compartment.getSalesOrder().getId()).stream()
                .filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .map(PickTask::getInventory)
                .map(inv -> inv.getSerialNo())
                .toList();

        return CompartmentContentsResponse.builder()
                .compartmentBarcode(compartmentBarcode)
                .salesOrderId(compartment.getSalesOrder().getId())
                .orderNumber(compartment.getSalesOrder().getSoNumber())
                .pickedItemBarcodes(pickedItems)
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
