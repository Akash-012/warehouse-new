package com.warehouse.wms.repository;

import com.warehouse.wms.entity.PickTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PickTaskRepository extends JpaRepository<PickTask, Long> {
	List<PickTask> findByStatusOrderByIdAsc(String status);

	List<PickTask> findBySalesOrderLineSalesOrderId(Long salesOrderId);

	Optional<PickTask> findByInventoryIdAndStatus(Long inventoryId, String status);
}
