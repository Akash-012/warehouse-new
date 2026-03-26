package com.warehouse.wms.repository;

import com.warehouse.wms.entity.ShipmentRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShipmentRecordRepository extends JpaRepository<ShipmentRecord, Long> {
    Optional<ShipmentRecord> findBySalesOrderId(Long salesOrderId);
}
