package com.warehouse.wms.repository;

import com.warehouse.wms.entity.SkuDimension;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkuDimensionRepository extends JpaRepository<SkuDimension, Long> {
	Optional<SkuDimension> findBySkuId(Long skuId);
}
