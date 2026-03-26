package com.warehouse.wms.exception;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(Long skuId, int requested, int available) {
        super("Insufficient stock for skuId=" + skuId + ", requested=" + requested + ", available=" + available);
    }
}
