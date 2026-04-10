package com.warehouse.wms.repository;

import com.warehouse.wms.entity.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {

    @Query("SELECT s.id, s.customerName, s.status, s.createdAt, s.soNumber FROM SalesOrder s ORDER BY s.id DESC")
    List<Object[]> findAllSummary();

    @Query("SELECT DISTINCT s FROM SalesOrder s LEFT JOIN FETCH s.lines l LEFT JOIN FETCH l.sku WHERE s.id = :id")
    Optional<SalesOrder> findDetailedById(@org.springframework.data.repository.query.Param("id") Long id);
}
