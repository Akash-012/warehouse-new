package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class TrolleyCreateRequest {
    @NotBlank(message = "trolleyBarcode is required")
    private String trolleyBarcode;

    @NotEmpty(message = "compartmentBarcodes are required")
    private List<String> compartmentBarcodes;
}
