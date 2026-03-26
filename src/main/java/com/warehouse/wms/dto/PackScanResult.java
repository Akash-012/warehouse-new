package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PackScanResult {
    int scanned;
    int remaining;
    boolean complete;
}
