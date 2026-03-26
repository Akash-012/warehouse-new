package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class PickTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sales_order_line_id", nullable = false)
    private SalesOrderLine salesOrderLine;

    @ManyToOne
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    @Column(name = "bin_barcode")
    private String binBarcode;

    @Column(name = "sku_code")
    private String skuCode;

    @Column(nullable = false)
    private Integer quantityToPick;

    private String status;

    @ManyToOne
    @JoinColumn(name = "trolley_id")
    private Trolley trolley;

    @ManyToOne
    @JoinColumn(name = "rack_compartment_id")
    private RackCompartment rackCompartment;
}
