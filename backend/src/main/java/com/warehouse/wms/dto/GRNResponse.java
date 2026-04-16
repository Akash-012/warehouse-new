package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class GRNResponse {
    Long id;
    String grnNo;
    Long purchaseOrderId;
    String poNumber;
    String supplier;
    List<GRNLineResponse> lines;
    Integer totalItems;
    Integer totalOrdered;
    Integer totalPending;
    LocalDateTime createdAt;

    // Tax summary
    BigDecimal subTotal;
    BigDecimal totalSgst;
    BigDecimal totalCgst;
    BigDecimal totalGst;
    BigDecimal grandTotal;
}
