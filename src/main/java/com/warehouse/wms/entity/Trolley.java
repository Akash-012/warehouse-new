package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class Trolley {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String trolleyIdentifier;
}
