package com.warehouse.wms.service;

import com.warehouse.wms.dto.PickTaskResponse;
import com.warehouse.wms.dto.SalesOrderLineRequest;
import com.warehouse.wms.dto.SalesOrderRequest;
import com.warehouse.wms.dto.SalesOrderResponse;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.entity.PickTask;
import com.warehouse.wms.entity.SalesOrder;
import com.warehouse.wms.entity.SalesOrderLine;
import com.warehouse.wms.entity.Sku;
import com.warehouse.wms.exception.InsufficientStockException;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.SalesOrderLineRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.SkuRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SalesOrderService {

    private final SalesOrderRepository salesOrderRepository;
    private final SalesOrderLineRepository salesOrderLineRepository;
    private final SkuRepository skuRepository;
    private final InventoryRepository inventoryRepository;
    private final PickTaskRepository pickTaskRepository;

    @Transactional
    public SalesOrderResponse createOrder(SalesOrderRequest request) {
        SalesOrder order = new SalesOrder();
        order.setSoNumber("SO-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        order.setCustomerName(request.getCustomerName());
        order.setOrderDate(LocalDate.now());
        order.setStatus("CREATED");

        salesOrderRepository.save(order);

        List<SalesOrderLine> lines = new ArrayList<>();
        List<Long> pickTaskIds = new ArrayList<>();

        for (SalesOrderLineRequest lineRequest : request.getLines()) {
            Sku sku = skuRepository.findById(lineRequest.getSkuId())
                    .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + lineRequest.getSkuId()));

            List<Inventory> available = inventoryRepository.findByStateAndSkuIdOrderByCreatedAtAsc(Inventory.InventoryState.AVAILABLE, sku.getId());
            int requested = lineRequest.getQuantity();
            if (available.size() < requested) {
                throw new InsufficientStockException(sku.getId(), requested, available.size());
            }

            SalesOrderLine line = new SalesOrderLine();
            line.setSalesOrder(order);
            line.setSku(sku);
            line.setQuantity(requested);
            line = salesOrderLineRepository.save(line);
            lines.add(line);

            for (int i = 0; i < requested; i++) {
                Inventory inv = available.get(i);
                inv.setState(Inventory.InventoryState.RESERVED);
                inventoryRepository.save(inv);

                PickTask task = new PickTask();
                task.setSalesOrderLine(line);
                task.setInventory(inv);
                task.setQuantityToPick(1);
                task.setStatus("PENDING");
                task.setBinBarcode(inv.getBin() != null ? inv.getBin().getBarcode() : null);
                task.setSkuCode(inv.getSku().getSkuCode());
                pickTaskRepository.save(task);
                pickTaskIds.add(task.getId());
            }
        }

        order.setLines(lines);
        order.setStatus("RESERVED");
        SalesOrder saved = salesOrderRepository.save(order);
        salesOrderRepository.flush();

        return SalesOrderResponse.builder()
                .orderId(saved.getId())
                .soNumber(saved.getSoNumber())
                .status(saved.getStatus())
                .pickTaskIds(pickTaskIds)
                .build();
    }

    public SalesOrder getOrder(Long orderId) {
        return salesOrderRepository.findDetailedById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Sales order not found: " + orderId));
    }

    public List<PickTaskResponse> getOrderPickTasks(Long orderId) {
        return pickTaskRepository.findBySalesOrderLineSalesOrderId(orderId).stream()
                .map(task -> PickTaskResponse.builder()
                        .id(task.getId())
                        .salesOrderLineId(task.getSalesOrderLine().getId())
                        .inventoryId(task.getInventory().getId())
                        .skuCode(task.getSkuCode())
                        .binBarcode(task.getBinBarcode())
                        .quantity(task.getQuantityToPick())
                        .state(task.getStatus())
                        .build())
                .toList();
    }
}
