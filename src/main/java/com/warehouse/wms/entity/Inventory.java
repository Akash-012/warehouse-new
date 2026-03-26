package com.warehouse.wms.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
public class Inventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sku_id", nullable = false)
    private Sku sku;

    @ManyToOne
    @JoinColumn(name = "bin_id")
    private Bin bin;

    @ManyToOne
    @JoinColumn(name = "goods_receipt_line_id")
    private GoodsReceiptLine goodsReceiptLine;

    @Column(name = "batch_no")
    private String batchNo;

    @Column(name = "serial_no", unique = true)
    private String serialNo;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InventoryState state;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum InventoryState {
        RECEIVED, IN_PUTAWAY, AVAILABLE, RESERVED, PICKED, PACKED, SHIPPED
    }
}
