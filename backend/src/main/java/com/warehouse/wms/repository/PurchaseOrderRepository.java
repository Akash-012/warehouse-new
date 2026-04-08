package com.warehouse.wms.repository;

import com.warehouse.wms.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    @Query("SELECT p.id, p.poNumber, p.supplier, p.status, COUNT(l), p.expectedArrivalDate " +
           "FROM PurchaseOrder p LEFT JOIN p.lines l " +
           "GROUP BY p.id, p.poNumber, p.supplier, p.status, p.expectedArrivalDate " +
           "ORDER BY p.id DESC")
    List<Object[]> findAllSummary();

    @Query("SELECT DISTINCT p FROM PurchaseOrder p " +
           "LEFT JOIN FETCH p.lines l " +
           "LEFT JOIN FETCH l.sku " +
           "WHERE p.id = :id")
    Optional<PurchaseOrder> findByIdWithLines(@Param("id") Long id);

    boolean existsByPoNumber(String poNumber);
}
