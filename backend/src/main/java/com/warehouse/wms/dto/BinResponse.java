package com.warehouse.wms.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class BinResponse {
    private Long id;
    private Long rackId;
    private String barcode;
    private BigDecimal lengthCm;
    private BigDecimal widthCm;
    private BigDecimal heightCm;
    private BigDecimal volumeCm3;
    private BigDecimal maxWeightG;
    private BigDecimal occupiedVolumeCm3;
    private BigDecimal occupiedWeightG;
    private String status;
    private BigDecimal utilizationPct;
}
