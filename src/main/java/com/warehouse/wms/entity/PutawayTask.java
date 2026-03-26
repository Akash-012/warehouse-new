package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class PutawayTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    @ManyToOne
    @JoinColumn(name = "suggested_bin_id")
    private Bin suggestedBin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PutawayTaskStatus status;

    @Column(nullable = false)
    private Integer priority;

    @ManyToOne
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    public enum PutawayTaskStatus {
        PENDING,
        COMPLETED,
        CANCELLED
    }
}
