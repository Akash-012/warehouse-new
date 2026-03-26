package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ZoneRequest {
    @NotNull(message = "warehouseId is required")
    private Long warehouseId;

    @NotBlank(message = "name is required")
    private String name;
}
