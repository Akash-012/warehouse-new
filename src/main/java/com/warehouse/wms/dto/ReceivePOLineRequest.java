package com.warehouse.wms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReceivePOLineRequest {
    @NotNull(message = "skuId is required")
    private Long skuId;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be at least 1")
    private Integer quantity;

    @NotBlank(message = "batchNo is required")
    private String batchNo;
}
