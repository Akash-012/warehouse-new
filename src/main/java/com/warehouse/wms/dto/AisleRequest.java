package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AisleRequest {
    @NotNull(message = "zoneId is required")
    private Long zoneId;

    @NotBlank(message = "aisleNumber is required")
    private String aisleNumber;
}
