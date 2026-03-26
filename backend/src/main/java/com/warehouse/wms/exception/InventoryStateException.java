package com.warehouse.wms.exception;

public class InventoryStateException extends RuntimeException {
    public InventoryStateException(String message) {
        super(message);
    }
}
