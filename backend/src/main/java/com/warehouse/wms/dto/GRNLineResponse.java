package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class GRNLineResponse {
    Long skuId;
    String skuCode;
    String batchNo;
    Integer quantity;
}
