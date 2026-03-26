package com.warehouse.wms.repository;

import com.warehouse.wms.entity.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    Optional<GoodsReceipt> findByGrnNo(String grnNo);
}
