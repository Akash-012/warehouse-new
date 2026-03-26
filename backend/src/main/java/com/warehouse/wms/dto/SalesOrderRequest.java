package com.warehouse.wms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SalesOrderRequest {
    @NotBlank(message = "customerName is required")
    private String customerName;

    @Valid
    @NotEmpty(message = "lines are required")
    private List<SalesOrderLineRequest> lines;
}
