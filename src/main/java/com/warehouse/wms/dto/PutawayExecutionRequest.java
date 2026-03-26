package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PutawayExecutionRequest {
    @NotBlank(message = "itemBarcode is required")
    private String itemBarcode;

    @NotBlank(message = "binBarcode is required")
    private String binBarcode;

    @NotNull(message = "userId is required")
    private Long userId;
}
