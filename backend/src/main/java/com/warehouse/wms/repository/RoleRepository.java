package com.warehouse.wms.repository;

import com.warehouse.wms.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
    Optional<Role> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
