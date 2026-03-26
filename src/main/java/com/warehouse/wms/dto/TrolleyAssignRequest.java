package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TrolleyAssignRequest {
    @NotBlank(message = "compartmentBarcode is required")
    private String compartmentBarcode;

    @NotNull(message = "salesOrderId is required")
    private Long salesOrderId;
}
