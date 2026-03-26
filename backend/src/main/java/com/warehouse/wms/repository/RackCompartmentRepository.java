package com.warehouse.wms.repository;

import com.warehouse.wms.entity.RackCompartment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RackCompartmentRepository extends JpaRepository<RackCompartment, Long> {
	Optional<RackCompartment> findByCompartmentIdentifier(String compartmentIdentifier);

	List<RackCompartment> findByTrolleyId(Long trolleyId);
}
