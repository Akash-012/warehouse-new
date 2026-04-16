package com.warehouse.wms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CreatePORequest {

    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;

    @NotBlank(message = "Supplier is required")
    private String supplier;

    private LocalDate expectedArrivalDate;

    @NotEmpty(message = "At least one product line is required")
    @Valid
    private List<LineItem> lines;

    @Data
    public static class LineItem {
        @NotNull(message = "SKU ID is required")
        @Positive
        private Long skuId;

        @NotNull(message = "Quantity is required")
        @Positive
        private Integer quantity;

        @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = true)
        private java.math.BigDecimal unitPrice;

        @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = true)
        private java.math.BigDecimal sgstRate;

        @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = true)
        private java.math.BigDecimal cgstRate;
    }
}
