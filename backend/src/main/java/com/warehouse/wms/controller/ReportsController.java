package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Inventory;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('REPORTS_VIEW')")
public class ReportsController {

    private final SkuRepository skuRepository;
    private final InventoryRepository inventoryRepository;
    private final PickTaskRepository pickTaskRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final ShipmentRecordRepository shipmentRecordRepository;

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

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        long shipmentsToday = shipmentRecordRepository.findAll().stream()
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().isAfter(todayStart))
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalSkus", totalSkus);
        result.put("openOrders", openOrders);
        result.put("pendingPicks", pendingPicks);
        result.put("shipmentsToday", shipmentsToday);
        return result;
    }

    @GetMapping("/inventory-by-state")
    public List<Map<String, Object>> inventoryByState() {
        List<Inventory> all = inventoryRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Inventory.InventoryState s : Inventory.InventoryState.values()) {
            long cnt = all.stream().filter(i -> i.getState() == s).count();
            if (cnt > 0) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("state", s.name());
                m.put("count", cnt);
                result.add(m);
            }
        }
        return result;
    }

    @GetMapping("/shipments-by-day")
    public List<Map<String, Object>> shipmentsByDay(
            @RequestParam(defaultValue = "") String from,
            @RequestParam(defaultValue = "") String to) {
        LocalDate fromDate = from.isBlank() ? LocalDate.now().minusDays(29) : LocalDate.parse(from);
        LocalDate toDate   = to.isBlank()   ? LocalDate.now()               : LocalDate.parse(to);

        List<Inventory> shipped = inventoryRepository.findByStateAndUpdatedAtBetween(
                Inventory.InventoryState.SHIPPED,
                fromDate.atStartOfDay(),
                toDate.plusDays(1).atStartOfDay());

        Map<String, Long> byDay = new LinkedHashMap<>();
        shipped.forEach(i -> {
            String day = i.getUpdatedAt().toLocalDate().toString();
            byDay.merge(day, 1L, Long::sum);
        });

        List<Map<String, Object>> result = new ArrayList<>();
        for (LocalDate d = fromDate; !d.isAfter(toDate); d = d.plusDays(1)) {
            String dateStr = d.toString();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", dateStr);
            m.put("count", byDay.getOrDefault(dateStr, 0L));
            result.add(m);
        }
        return result;
    }
}
