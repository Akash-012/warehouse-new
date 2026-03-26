package com.warehouse.wms.repository;

import com.warehouse.wms.entity.MovementLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovementLogRepository extends JpaRepository<MovementLog, Long> {
}
