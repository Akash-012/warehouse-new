package com.warehouse.wms.repository;

import com.warehouse.wms.entity.Sku;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkuRepository extends JpaRepository<Sku, Long> {
	Optional<Sku> findBySkuCode(String skuCode);
}
