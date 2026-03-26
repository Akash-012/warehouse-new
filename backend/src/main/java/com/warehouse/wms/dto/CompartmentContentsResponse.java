package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class CompartmentContentsResponse {
    String compartmentBarcode;
    Long salesOrderId;
    String orderNumber;
    List<String> pickedItemBarcodes;
}
