package com.warehouse.wms.repository;

import com.warehouse.wms.entity.Trolley;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrolleyRepository extends JpaRepository<Trolley, Long> {
	Optional<Trolley> findByTrolleyIdentifier(String trolleyIdentifier);
}
