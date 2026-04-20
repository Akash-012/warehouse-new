package com.warehouse.wms.repository;

import com.warehouse.wms.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    @Query("SELECT DISTINCT i FROM Inventory i JOIN FETCH i.sku LEFT JOIN FETCH i.bin ORDER BY i.id DESC")
    List<Inventory> findAllWithDetails();

    Optional<Inventory> findBySerialNo(String serialNo);

    List<Inventory> findByGoodsReceiptLineId(Long goodsReceiptLineId);

    long countBySkuIdAndBatchNo(Long skuId, String batchNo);

    List<Inventory> findByStateAndGoodsReceiptLineGoodsReceiptId(Inventory.InventoryState state, Long goodsReceiptId);

    List<Inventory> findByStateAndSkuIdOrderByCreatedAtAsc(Inventory.InventoryState state, Long skuId);

    List<Inventory> findByStateAndBinBarcode(Inventory.InventoryState state, String barcode);

    List<Inventory> findByStateAndUpdatedAtBetween(Inventory.InventoryState state,
            java.time.LocalDateTime from, java.time.LocalDateTime to);

    @Modifying
    @Query("UPDATE Inventory i SET i.state = :toState WHERE i.id IN :ids")
    int bulkUpdateState(@Param("ids") List<Long> ids,
            @Param("toState") Inventory.InventoryState toState);

    /** Product-wise stock summary by state: returns [skuId, skuCode, description, category, state, totalQty, lowStockThreshold] */
    @Query("SELECT i.sku.id, i.sku.skuCode, i.sku.description, i.sku.category, i.state, SUM(i.quantity), i.sku.lowStockThreshold " +
           "FROM Inventory i " +
           "WHERE i.state <> com.warehouse.wms.entity.Inventory.InventoryState.SHIPPED " +
           "GROUP BY i.sku.id, i.sku.skuCode, i.sku.description, i.sku.category, i.state, i.sku.lowStockThreshold " +
           "ORDER BY i.sku.skuCode ASC")
    List<Object[]> findStockSummaryByState();

    /** Total available qty per SKU (for low-stock check) */
    @Query("SELECT i.sku.id, SUM(i.quantity) FROM Inventory i " +
           "WHERE i.state = com.warehouse.wms.entity.Inventory.InventoryState.AVAILABLE " +
           "GROUP BY i.sku.id")
    List<Object[]> findAvailableQtyPerSku();

    /** Count items already received for a PO+SKU combination (excludes SHIPPED to allow re-receiving). */
    @Query("SELECT COUNT(i) FROM Inventory i " +
           "WHERE i.goodsReceiptLine.goodsReceipt.purchaseOrder.id = :poId " +
           "AND i.sku.id = :skuId " +
           "AND i.state <> com.warehouse.wms.entity.Inventory.InventoryState.SHIPPED")
    long countReceivedForPurchaseOrderSku(@Param("poId") Long poId, @Param("skuId") Long skuId);
}
