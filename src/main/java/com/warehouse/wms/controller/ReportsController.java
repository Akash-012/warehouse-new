package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.SkuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportsController {

    private final SkuRepository skuRepository;
    private final InventoryRepository inventoryRepository;
    private final PickTaskRepository pickTaskRepository;
    private final SalesOrderRepository salesOrderRepository;

    @GetMapping("/kpis")
    public Map<String, Object> kpis() {
        long totalSkus = skuRepository.count();
        long pendingPicks = pickTaskRepository.findByStatusOrderByIdAsc("PENDING").size();

        List<Object[]> orders = salesOrderRepository.findAllSummary();
        long openOrders = orders.stream()
                .filter(row -> {
                    String st = row[2] != null ? row[2].toString() : "";
                    return !st.equals("SHIPPED") && !st.equals("CANCELLED");
                }).count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalSkus", totalSkus);
        result.put("openOrders", openOrders);
        result.put("pendingPicks", pendingPicks);
        return result;
    }

    @GetMapping("/inventory-by-state")
    public Map<String, Long> inventoryByState() {
        List<Inventory> all = inventoryRepository.findAll();
        Map<String, Long> byState = new LinkedHashMap<>();
        for (Inventory.InventoryState s : Inventory.InventoryState.values()) {
            long cnt = all.stream().filter(i -> i.getState() == s).count();
            if (cnt > 0) byState.put(s.name(), cnt);
        }
        return byState;
    }
}
