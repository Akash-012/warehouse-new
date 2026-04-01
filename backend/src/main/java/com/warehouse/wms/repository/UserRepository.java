package com.warehouse.wms.repository;

import com.warehouse.wms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByRoleId(Long roleId);
}
