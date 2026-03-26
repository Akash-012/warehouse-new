package com.warehouse.wms.repository;

import com.warehouse.wms.entity.SalesOrderLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalesOrderLineRepository extends JpaRepository<SalesOrderLine, Long> {
	List<SalesOrderLine> findBySalesOrderId(Long salesOrderId);
}
