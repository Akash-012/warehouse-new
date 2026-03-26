package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PackingScanRequest {
    @NotBlank(message = "itemBarcode is required")
    private String itemBarcode;

    @NotBlank(message = "compartmentBarcode is required")
    private String compartmentBarcode;
}
