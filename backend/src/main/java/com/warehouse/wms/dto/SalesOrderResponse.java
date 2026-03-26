package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class SalesOrderResponse {
    Long orderId;
    String soNumber;
    String status;
    List<Long> pickTaskIds;
}
