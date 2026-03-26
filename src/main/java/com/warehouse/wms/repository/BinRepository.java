package com.warehouse.wms.repository;

import com.warehouse.wms.entity.Bin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface BinRepository extends JpaRepository<Bin, Long> {

    /**
     * Finds bins that have enough capacity for a given volume and weight.
     * @param volRequired The required volume.
     * @param weightRequired The required weight.
     * @return A list of bins with sufficient capacity.
     */
    @Query("SELECT b FROM Bin b WHERE b.status = 'AVAILABLE' AND (b.volumeCm3 - b.occupiedVolumeCm3) >= :volRequired AND (b.maxWeightG - b.occupiedWeightG) >= :weightRequired ORDER BY b.occupiedVolumeCm3 DESC")
    List<Bin> findBinsWithCapacity(@Param("volRequired") BigDecimal volRequired, @Param("weightRequired") BigDecimal weightRequired);

    java.util.Optional<Bin> findByBarcode(String barcode);

    boolean existsByBarcode(String barcode);

    @Modifying
    @Query("UPDATE Bin b SET b.status = 'AVAILABLE' WHERE b.status = 'FULL' AND COALESCE(b.occupiedVolumeCm3, 0) = 0 AND COALESCE(b.occupiedWeightG, 0) = 0")
    int resetInvalidFullBins();
}
