package com.warehouse.wms.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ShipmentConfirmedEvent extends ApplicationEvent {

    private final Long orderId;
    private final String awbNumber;
    private final String courierName;

    public ShipmentConfirmedEvent(Object source, Long orderId, String awbNumber, String courierName) {
        super(source);
        this.orderId = orderId;
        this.awbNumber = awbNumber;
        this.courierName = courierName;
    }
}
