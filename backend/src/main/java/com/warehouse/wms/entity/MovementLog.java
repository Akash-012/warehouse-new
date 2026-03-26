package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
public class MovementLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    @Enumerated(EnumType.STRING)
    private Inventory.InventoryState fromState;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Inventory.InventoryState toState;

    @ManyToOne
    @JoinColumn(name = "bin_id")
    private Bin bin;

    private Long userId; // Would reference a User entity

    private String action;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
