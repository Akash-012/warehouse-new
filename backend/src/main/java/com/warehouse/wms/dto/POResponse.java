package com.warehouse.wms.dto;

import com.warehouse.wms.entity.PurchaseOrder;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class POResponse {

    private Long id;
    private String poNumber;
    private String supplier;
    private String status;
    private PurchaseOrder.Priority priority;
    private LocalDate expectedArrivalDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<LineItem> lines;

    @Data
    @Builder
    public static class LineItem {
        private Long id;
        private Long skuId;
        private String skuCode;
        private String skuDescription;
        private Integer quantity;
    }
}
