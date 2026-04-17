package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PackingScanRequest {
    @NotBlank(message = "itemBarcode is required")
    private String itemBarcode;

    @NotNull(message = "orderId is required")
    private Long orderId;
}
