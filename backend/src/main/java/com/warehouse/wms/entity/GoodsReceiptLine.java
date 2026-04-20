package com.warehouse.wms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@Entity
@Table(name = "goods_receipt_line")
public class GoodsReceiptLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne
    @JoinColumn(name = "goods_receipt_id", nullable = false)
    private GoodsReceipt goodsReceipt;

    @ManyToOne
    @JoinColumn(name = "sku_id", nullable = false)
    private Sku sku;

    @Column(name = "batch_no")
    private String batchNo;

    @Column(name = "expiry_date")
    private java.time.LocalDate expiryDate;

    @Column(name = "quantity_received", nullable = false)
    private Integer quantityReceived;
}
