package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.ShipmentRecordRepository;
import com.warehouse.wms.repository.SkuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final SkuRepository skuRepository;
    private final InventoryRepository inventoryRepository;
    private final PickTaskRepository pickTaskRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final ShipmentRecordRepository shipmentRecordRepository;

    @GetMapping("/kpis")
    public Map<String, Object> kpis() {
        long totalSkus = skuRepository.count();
        long totalBins = 40;

        List<Inventory> all = inventoryRepository.findAll();

        Map<String, Long> byState = new LinkedHashMap<>();
        for (Inventory.InventoryState s : Inventory.InventoryState.values()) {
            long cnt = all.stream().filter(i -> i.getState() == s).count();
            if (cnt > 0) byState.put(s.name(), cnt);
        }

        long pendingPicks = pickTaskRepository.findByStatusOrderByIdAsc("PENDING").size();

        List<Object[]> orders = salesOrderRepository.findAllSummary();
        long openOrders = orders.stream()
                .filter(row -> {
                    String st = row[2] != null ? row[2].toString() : "";
                    return !st.equals("SHIPPED") && !st.equals("CANCELLED");
                }).count();

        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        long shippedToday = shipmentRecordRepository.findAll().stream()
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().isAfter(todayStart))
                .count();

        long inboundToday = inventoryRepository.findAll().stream()
                .filter(i -> i.getCreatedAt() != null && i.getCreatedAt().isAfter(todayStart)
                        && i.getState() == Inventory.InventoryState.RECEIVED)
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalSkus", totalSkus);
        result.put("binUtilizationPct", totalBins > 0 ? (long) (byState.getOrDefault("AVAILABLE", 0L) * 100 / totalBins) : 0);
        result.put("openOrders", openOrders);
        result.put("pendingPicks", pendingPicks);
        result.put("shippedToday", shippedToday);
        result.put("inboundToday", inboundToday);
        result.put("ordersToday", openOrders);
        result.put("itemsPacked", byState.getOrDefault("PACKED", 0L));
        result.put("inventoryByState", byState);
        return result;
    }

    @GetMapping("/charts/shipments")
    public List<Map<String, Object>> shipmentsChart(@RequestParam(defaultValue = "7") int days) {
        LocalDateTime from = LocalDateTime.now().minusDays(days);
        List<Inventory> shipped = inventoryRepository.findByStateAndUpdatedAtBetween(
                Inventory.InventoryState.SHIPPED, from, LocalDateTime.now());
        Map<String, Long> byDay = new LinkedHashMap<>();
        shipped.forEach(i -> {
            String day = i.getUpdatedAt().toLocalDate().toString();
            byDay.merge(day, 1L, Long::sum);
        });
        return byDay.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("date", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                }).toList();
    }
}
