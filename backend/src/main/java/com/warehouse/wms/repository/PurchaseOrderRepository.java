package com.warehouse.wms.repository;

import com.warehouse.wms.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    @Query("SELECT p.id, p.poNumber, p.supplier, p.status, COUNT(l), p.expectedArrivalDate " +
           "FROM PurchaseOrder p LEFT JOIN p.lines l " +
           "GROUP BY p.id, p.poNumber, p.supplier, p.status, p.expectedArrivalDate " +
           "ORDER BY p.id DESC")
    List<Object[]> findAllSummary();
}
