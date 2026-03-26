package com.warehouse.wms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class PackingManifestLine {
    String skuCode;
    Integer expectedQty;
    List<String> itemBarcodes;
}
