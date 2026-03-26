package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ExecutionResult {
    boolean success;
    Long inventoryId;
    String binBarcode;
    String newBinStatus;
    String itemBarcode;
}
