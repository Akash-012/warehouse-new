package com.warehouse.wms.controller;

import com.warehouse.wms.dto.PermissionResponse;
import com.warehouse.wms.dto.RoleRequest;
import com.warehouse.wms.dto.RoleResponse;
import com.warehouse.wms.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('USERS_MANAGE')")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ResponseEntity<List<RoleResponse>> list() {
        return ResponseEntity.ok(roleService.listAll());
    }

    @GetMapping("/permissions")
    public ResponseEntity<List<PermissionResponse>> listPermissions() {
        return ResponseEntity.ok(roleService.listPermissions());
    }

    @PostMapping
    public ResponseEntity<RoleResponse> create(@Valid @RequestBody RoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> update(@PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        return ResponseEntity.ok(roleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
