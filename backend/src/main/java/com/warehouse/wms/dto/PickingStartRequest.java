package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PickingStartRequest {
    private String trolleyBarcode;
    private String rackCompartmentBarcode;

    @NotNull(message = "salesOrderId is required")
    private Long salesOrderId;
}
