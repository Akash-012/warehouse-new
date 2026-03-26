package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class GRNResponse {
    String grnNo;
    Long purchaseOrderId;
    List<GRNLineResponse> lines;
    Integer totalItems;
    LocalDateTime createdAt;
}
