package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PickScanRequest {
    @NotBlank(message = "itemBarcode is required")
    private String itemBarcode;

    private String binBarcode;
    private String trolleyBarcode;
    private String rackCompartmentBarcode;
}
