package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PickTaskResponse {
    Long id;
    Long salesOrderLineId;
    Long inventoryId;
    String skuCode;
    String binBarcode;
    Integer quantity;
    String state;
}
