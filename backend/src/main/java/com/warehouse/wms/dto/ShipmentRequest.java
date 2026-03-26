package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ShipmentRequest {
    @NotNull(message = "orderId is required")
    private Long orderId;

    @NotBlank(message = "awbNumber is required")
    private String awbNumber;

    @NotBlank(message = "courierName is required")
    private String courierName;
}
