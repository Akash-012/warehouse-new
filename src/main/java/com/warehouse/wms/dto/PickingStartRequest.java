package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PickingStartRequest {
    @NotBlank(message = "trolleyBarcode is required")
    private String trolleyBarcode;

    @NotBlank(message = "rackCompartmentBarcode is required")
    private String rackCompartmentBarcode;

    @NotNull(message = "salesOrderId is required")
    private Long salesOrderId;

    @NotNull(message = "userId is required")
    private Long userId;
}
