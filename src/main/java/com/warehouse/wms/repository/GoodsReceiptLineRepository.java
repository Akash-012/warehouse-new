package com.warehouse.wms.repository;

import com.warehouse.wms.entity.GoodsReceiptLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoodsReceiptLineRepository extends JpaRepository<GoodsReceiptLine, Long> {
    List<GoodsReceiptLine> findByGoodsReceiptId(Long goodsReceiptId);
}
