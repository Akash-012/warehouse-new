package com.warehouse.wms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.Formula;

import java.math.BigDecimal;

@Data
@Entity
public class Bin {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "rack_id")
    private Rack rack;

    @Column(unique = true, nullable = false)
    private String barcode;

    @Column(nullable = false)
    private BigDecimal lengthCm;

    @Column(nullable = false)
    private BigDecimal widthCm;

    @Column(nullable = false)
    private BigDecimal heightCm;

    @Formula("length_cm * width_cm * height_cm")
    private BigDecimal volumeCm3;

    @Column(nullable = false, name = "max_weight_g")
    private BigDecimal maxWeightG;

    @Column(columnDefinition = "DECIMAL(10, 2) DEFAULT 0", name = "occupied_volume_cm3")
    private BigDecimal occupiedVolumeCm3;

    @Column(columnDefinition = "DECIMAL(10, 2) DEFAULT 0", name = "occupied_weight_g")
    private BigDecimal occupiedWeightG;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BinStatus status;

    public enum BinStatus {
        AVAILABLE, FULL, BLOCKED
    }
}
