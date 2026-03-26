package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PickScanRequest {
    @NotBlank(message = "binBarcode is required")
    private String binBarcode;

    @NotBlank(message = "itemBarcode is required")
    private String itemBarcode;

    @NotBlank(message = "trolleyBarcode is required")
    private String trolleyBarcode;

    @NotBlank(message = "rackCompartmentBarcode is required")
    private String rackCompartmentBarcode;
}
