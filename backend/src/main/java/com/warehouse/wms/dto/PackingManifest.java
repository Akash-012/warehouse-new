package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class PackingManifest {
    Long orderId;
    String customerName;
    List<PackingManifestLine> lines;
}
