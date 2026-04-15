package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Bin;
import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.repository.BinRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.ShipmentRecordRepository;
import com.warehouse.wms.repository.SkuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('DASHBOARD_VIEW')")
public class DashboardController {

    private final SkuRepository skuRepository;
    private final InventoryRepository inventoryRepository;
    private final PickTaskRepository pickTaskRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final ShipmentRecordRepository shipmentRecordRepository;
    private final BinRepository binRepository;

    @GetMapping("/kpis")
    public Map<String, Object> kpis() {
        long totalSkus = skuRepository.count();

        // Bin utilization: actual occupied volume / total capacity
        List<Bin> allBins = binRepository.findAll();
        double totalVolumeCm3 = allBins.stream()
                .mapToDouble(b -> b.getVolumeCm3() != null ? b.getVolumeCm3().doubleValue() : 0.0)
                .sum();
        double occupiedVolumeCm3 = allBins.stream()
                .mapToDouble(b -> b.getOccupiedVolumeCm3() != null ? b.getOccupiedVolumeCm3().doubleValue() : 0.0)
                .sum();
        double binUtilizationPct = totalVolumeCm3 > 0 ? (occupiedVolumeCm3 / totalVolumeCm3) * 100.0 : 0.0;

        // Inventory breakdown by state
        List<Inventory> all = inventoryRepository.findAllWithDetails();
        Map<String, Long> byState = new LinkedHashMap<>();
        for (Inventory.InventoryState s : Inventory.InventoryState.values()) {
            long cnt = all.stream().filter(i -> i.getState() == s).count();
            if (cnt > 0) byState.put(s.name(), cnt);
        }

        long pendingPicks = pickTaskRepository.findByStatusOrderByIdAsc("PENDING").size();

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();

        // Open orders: not shipped/cancelled
        List<Object[]> allOrders = salesOrderRepository.findAllSummary();
        long openOrders = allOrders.stream()
                .filter(row -> {
                    String st = row[2] != null ? row[2].toString() : "";
                    return !st.equals("SHIPPED") && !st.equals("CANCELLED");
                }).count();

        // Orders created today
        long ordersToday = allOrders.stream()
                .filter(row -> row[3] != null && ((LocalDateTime) row[3]).isAfter(todayStart))
                .count();

        // Shipped today (by shipment record)
        long shippedToday = shipmentRecordRepository.findAll().stream()
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().isAfter(todayStart))
                .count();

        // Inbound today: ALL inventory items created today (regardless of current state)
        long inboundToday = all.stream()
                .filter(i -> i.getCreatedAt() != null && i.getCreatedAt().isAfter(todayStart))
                .count();

        // Items currently in PACKED state (awaiting dispatch)
        long itemsPacked = byState.getOrDefault("PACKED", 0L);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalSkus", totalSkus);
        result.put("totalBins", allBins.size());
        result.put("binUtilizationPct", Math.round(binUtilizationPct * 10.0) / 10.0);
        result.put("openOrders", openOrders);
        result.put("pendingPicks", pendingPicks);
        result.put("shippedToday", shippedToday);
        result.put("inboundToday", inboundToday);
        result.put("ordersToday", ordersToday);
        result.put("itemsPacked", itemsPacked);
        result.put("inventoryByState", byState);
        return result;
    }

    @GetMapping("/charts/shipments")
    public List<Map<String, Object>> shipmentsChart(@RequestParam(defaultValue = "7") int days) {
        LocalDateTime from = LocalDate.now().minusDays(days - 1L).atStartOfDay();
        List<Inventory> shipped = inventoryRepository.findByStateAndUpdatedAtBetween(
                Inventory.InventoryState.SHIPPED, from, LocalDateTime.now());

        Map<String, Long> byDay = new LinkedHashMap<>();
        shipped.forEach(i -> {
            String day = i.getUpdatedAt().toLocalDate().toString();
            byDay.merge(day, 1L, Long::sum);
        });

        // Always fill all N days so chart always shows a full timeline
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            String dateStr = LocalDate.now().minusDays(i).toString();
            Map<String, Object> m = new HashMap<>();
            m.put("date", dateStr);
            m.put("count", byDay.getOrDefault(dateStr, 0L));
            result.add(m);
        }
        return result;
    }
}
