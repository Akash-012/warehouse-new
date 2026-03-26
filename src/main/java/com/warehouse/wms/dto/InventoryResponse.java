package com.warehouse.wms.dto;

import lombok.Data;

@Data
public class InventoryResponse {
    private Long id;
    private String skuCode;
    private String itemBarcode;
    private String state;
    private String binBarcode;
    private String batchNo;
    private Integer quantity;
}
