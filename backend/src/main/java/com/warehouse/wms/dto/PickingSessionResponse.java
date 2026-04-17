package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

import lombok.Data;

@Value
@Builder

public class PickingSessionResponse {
    Long orderId;
    List<PickingSessionItem> items;

    @Value
    @Builder
    public static class PickingSessionItem {
        String barcode;
        String sku;
        String skuCode;
        Long taskId;
    }
}
