package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "shipment_record")
public class ShipmentRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @Column(name = "awb_number", nullable = false)
    private String awbNumber;

    @Column(name = "courier_name", nullable = false)
    private String courierName;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
