package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class GRNLineResponse {
    Long skuId;
    String skuCode;
    String skuDescription;
    String batchNo;
    Integer orderedQty;
    Integer receivedQty;
    Integer pendingQty;
    BigDecimal unitPrice;
    BigDecimal lineTotal;
    BigDecimal sgstRate;
    BigDecimal cgstRate;
    BigDecimal sgstAmount;
    BigDecimal cgstAmount;
    BigDecimal gstAmount;       // sgstAmount + cgstAmount
    BigDecimal lineTotalWithTax;
}
