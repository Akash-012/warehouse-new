package com.warehouse.wms.repository;

import com.warehouse.wms.entity.PutawayTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PutawayTaskRepository extends JpaRepository<PutawayTask, Long> {

    List<PutawayTask> findByWarehouseIdAndStatusOrderByPriorityAscIdAsc(Long warehouseId, PutawayTask.PutawayTaskStatus status);

    List<PutawayTask> findByStatusOrderByPriorityAscIdAsc(PutawayTask.PutawayTaskStatus status);

    java.util.Optional<PutawayTask> findByInventoryIdAndStatus(Long inventoryId, PutawayTask.PutawayTaskStatus status);

    boolean existsByInventoryId(Long inventoryId);
}
