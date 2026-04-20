package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@Entity
public class Sku {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String skuCode;

    private String description;

    @Column(name = "category")
    private String category;

    @Column(name = "low_stock_threshold")
    private Integer lowStockThreshold;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @OneToOne(mappedBy = "sku", cascade = CascadeType.ALL)
    private SkuDimension dimension;
}
