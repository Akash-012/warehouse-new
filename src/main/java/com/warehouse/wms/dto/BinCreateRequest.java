package com.warehouse.wms.dto;

import com.warehouse.wms.entity.Bin;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BinCreateRequest {
    @NotNull(message = "rackId is required")
    private Long rackId;

    @NotBlank(message = "barcode is required")
    private String barcode;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal lengthCm;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal widthCm;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal heightCm;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal maxWeightG;

    @NotNull
    private Bin.BinStatus status;
}
