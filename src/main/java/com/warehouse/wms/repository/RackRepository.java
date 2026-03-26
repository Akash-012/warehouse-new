package com.warehouse.wms.repository;

import com.warehouse.wms.entity.Rack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RackRepository extends JpaRepository<Rack, Long> {
	Optional<Rack> findByRackIdentifier(String rackIdentifier);
}
