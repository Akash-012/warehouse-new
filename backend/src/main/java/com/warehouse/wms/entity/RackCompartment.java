package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class RackCompartment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "rack_id", nullable = false)
    private Rack rack;

    @Column(nullable = false)
    private String compartmentIdentifier;

    @ManyToOne
    @JoinColumn(name = "sales_order_id")
    private SalesOrder salesOrder;

    @ManyToOne
    @JoinColumn(name = "trolley_id")
    private Trolley trolley;
}
