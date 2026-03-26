package com.warehouse.wms.repository;

import com.warehouse.wms.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    /**
     * Finds available inventory for a given SKU, ordered by creation date (FIFO).
     * @param skuId The ID of the SKU.
     * @return A list of available inventory.
     */
    @Query("SELECT i FROM Inventory i WHERE i.sku.id = :skuId AND i.state = 'AVAILABLE' ORDER BY i.createdAt ASC")
    List<Inventory> findAvailableBySkuFifo(@Param("skuId") Long skuId);

    List<Inventory> findByGoodsReceiptLineGoodsReceiptIdAndState(Long goodsReceiptId, Inventory.InventoryState state);

    java.util.Optional<Inventory> findBySerialNo(String serialNo);

    long countBySkuIdAndBatchNo(Long skuId, String batchNo);

    List<Inventory> findByStateAndGoodsReceiptLineGoodsReceiptId(Inventory.InventoryState state, Long goodsReceiptId);

    List<Inventory> findByStateAndSkuIdOrderByCreatedAtAsc(Inventory.InventoryState state, Long skuId);

    List<Inventory> findByStateAndBinBarcode(Inventory.InventoryState state, String barcode);

    List<Inventory> findByStateAndUpdatedAtBetween(Inventory.InventoryState state, java.time.LocalDateTime from, java.time.LocalDateTime to);

    @Modifying
    @Query("UPDATE Inventory i SET i.state = :toState WHERE i.id IN :ids")
    int bulkUpdateState(@Param("ids") List<Long> ids, @Param("toState") Inventory.InventoryState toState);

    @Query("SELECT COUNT(i) FROM Inventory i WHERE i.goodsReceiptLine.goodsReceipt.purchaseOrder.id = :poId AND i.sku.id = :skuId")
    long countReceivedForPurchaseOrderSku(@Param("poId") Long poId, @Param("skuId") Long skuId);
}
