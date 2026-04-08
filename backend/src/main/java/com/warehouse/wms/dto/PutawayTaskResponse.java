package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PutawayTaskResponse {
    Long taskId;
    Long inventoryId;
    String itemBarcode;
    String suggestedBinBarcode;
    Integer priority;
    String state;
    String skuCode;
    String skuName;
    String grnNo;
    String poNumber;
}
