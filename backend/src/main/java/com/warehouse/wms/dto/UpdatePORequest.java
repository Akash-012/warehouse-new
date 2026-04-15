package com.warehouse.wms.dto;

import com.warehouse.wms.entity.PurchaseOrder;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdatePORequest {

    private String supplier;
    private LocalDate expectedArrivalDate;
    private PurchaseOrder.Priority priority;

    @Valid
    private List<LineItem> lines;

    @Data
    public static class LineItem {
        private Long id;           // null = new line, non-null = update existing

        @Positive
        private Long skuId;

        @Positive
        private Integer quantity;
    }
}
