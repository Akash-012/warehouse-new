package com.warehouse.wms.controller;

import com.warehouse.wms.entity.Inventory;
import com.warehouse.wms.repository.GoodsReceiptRepository;
import com.warehouse.wms.repository.InventoryRepository;
import com.warehouse.wms.repository.PickTaskRepository;
import com.warehouse.wms.repository.SalesOrderRepository;
import com.warehouse.wms.repository.ShipmentRecordRepository;
import com.warehouse.wms.repository.SkuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final GoodsReceiptRepository goodsReceiptRepository;

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
            .filter(s -> s.getCreatedAt() != null && !s.getCreatedAt().isBefore(todayStart))
            .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalSkus", totalSkus);
        result.put("openOrders", openOrders);
        result.put("pendingPicks", pendingPicks);
        result.put("shipmentsToday", shipmentsToday);
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

    @GetMapping("/shipments-by-day")
    public List<Map<String, Object>> shipmentsByDay(
            @RequestParam String from,
            @RequestParam String to) {

        LocalDate fromDate;
        LocalDate toDate;
        try {
            fromDate = LocalDate.parse(from);
            toDate = LocalDate.parse(to);
        } catch (DateTimeParseException ex) {
            return List.of();
        }

        if (toDate.isBefore(fromDate)) {
            return List.of();
        }

        LocalDateTime fromTs = fromDate.atStartOfDay();
        LocalDateTime toTsExclusive = toDate.plusDays(1).atStartOfDay();

        Map<String, Long> byDay = shipmentRecordRepository.findAll().stream()
                .filter(s -> s.getCreatedAt() != null
                        && !s.getCreatedAt().isBefore(fromTs)
                        && s.getCreatedAt().isBefore(toTsExclusive))
                .collect(Collectors.groupingBy(
                        s -> s.getCreatedAt().toLocalDate().toString(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (LocalDate day = fromDate; !day.isAfter(toDate); day = day.plusDays(1)) {
            Map<String, Object> row = new LinkedHashMap<>();
            String dayKey = day.toString();
            row.put("date", dayKey);
            row.put("count", byDay.getOrDefault(dayKey, 0L));
            result.add(row);
        }

        return result;
    }

    @GetMapping("/inventory.csv")
    public ResponseEntity<String> inventoryCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("Inventory ID,SKU Code,SKU Name,Bin,State,Batch,Serial No,Quantity,Updated At\n");
        inventoryRepository.findAll().forEach(i -> {
            csv.append(csvRow(
                    i.getId(),
                    i.getSku() != null ? i.getSku().getSkuCode() : "",
                    i.getSku() != null ? i.getSku().getDescription() : "",
                    i.getBin() != null ? i.getBin().getBarcode() : "",
                    i.getState() != null ? i.getState().name() : "",
                    i.getBatchNo(),
                    i.getSerialNo(),
                    i.getQuantity(),
                    i.getUpdatedAt()
            ));
        });
        return csvResponse(csv.toString());
    }

    @GetMapping("/orders.csv")
    public ResponseEntity<String> ordersCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("Order ID,SO Number,Customer,Order Date,Status,Created At\n");
        salesOrderRepository.findAll().forEach(o -> {
            csv.append(csvRow(
                    o.getId(),
                    o.getSoNumber(),
                    o.getCustomerName(),
                    o.getOrderDate(),
                    o.getStatus(),
                    o.getCreatedAt()
            ));
        });
        return csvResponse(csv.toString());
    }

    @GetMapping("/grns.csv")
    public ResponseEntity<String> grnsCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("GRN ID,GRN Number,PO ID,PO Number,Created At\n");
        goodsReceiptRepository.findAll().forEach(g -> {
            csv.append(csvRow(
                    g.getId(),
                    g.getGrnNo(),
                    g.getPurchaseOrder() != null ? g.getPurchaseOrder().getId() : "",
                    g.getPurchaseOrder() != null ? g.getPurchaseOrder().getPoNumber() : "",
                    g.getCreatedAt()
            ));
        });
        return csvResponse(csv.toString());
    }

    @GetMapping("/shipments.csv")
    public ResponseEntity<String> shipmentsCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("Shipment ID,SO Number,Customer,AWB,Courier,Created At\n");
        shipmentRecordRepository.findAll().forEach(s -> {
            csv.append(csvRow(
                    s.getId(),
                    s.getSalesOrder() != null ? s.getSalesOrder().getSoNumber() : "",
                    s.getSalesOrder() != null ? s.getSalesOrder().getCustomerName() : "",
                    s.getAwbNumber(),
                    s.getCourierName(),
                    s.getCreatedAt()
            ));
        });
        return csvResponse(csv.toString());
    }

    private ResponseEntity<String> csvResponse(String body) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(body);
    }

    private String csvRow(Object... values) {
        return java.util.Arrays.stream(values)
                .map(v -> escapeCsv(v == null ? "" : String.valueOf(v)))
                .collect(Collectors.joining(","))
                .concat("\n");
    }

    private String escapeCsv(String value) {
        String normalized = value.replace("\r", " ").replace("\n", " ");
        if (normalized.contains(",") || normalized.contains("\"") || normalized.contains(" ")) {
            return "\"" + normalized.replace("\"", "\"\"") + "\"";
        }
        return normalized;
    }
}
