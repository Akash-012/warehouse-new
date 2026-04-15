package com.warehouse.wms.exception;

public class PoNotEditableException extends RuntimeException {
    public PoNotEditableException(String poNumber, String status) {
        super("Purchase order " + poNumber + " cannot be edited in status: " + status);
    }
}
