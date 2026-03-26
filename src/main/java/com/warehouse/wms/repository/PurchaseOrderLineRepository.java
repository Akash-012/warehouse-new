package com.warehouse.wms.repository;

import com.warehouse.wms.entity.PurchaseOrderLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PurchaseOrderLineRepository extends JpaRepository<PurchaseOrderLine, Long> {
	Optional<PurchaseOrderLine> findByPurchaseOrderIdAndSkuId(Long purchaseOrderId, Long skuId);
}
