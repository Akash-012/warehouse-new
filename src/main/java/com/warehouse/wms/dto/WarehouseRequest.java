package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WarehouseRequest {
    @NotBlank(message = "name is required")
    private String name;

    @NotBlank(message = "location is required")
    private String location;
}
