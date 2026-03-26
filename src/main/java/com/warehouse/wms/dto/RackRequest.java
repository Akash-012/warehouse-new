package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RackRequest {
    @NotNull(message = "aisleId is required")
    private Long aisleId;

    @NotBlank(message = "rackIdentifier is required")
    private String rackIdentifier;
}
