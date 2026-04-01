package com.warehouse.wms.service;

import com.warehouse.wms.dto.PermissionResponse;
import com.warehouse.wms.dto.RoleRequest;
import com.warehouse.wms.dto.RoleResponse;
import com.warehouse.wms.entity.Permission;
import com.warehouse.wms.entity.Role;
import com.warehouse.wms.repository.RoleRepository;
import com.warehouse.wms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    public List<RoleResponse> listAll() {
        return roleRepository.findAll().stream()
                .sorted(Comparator.comparing(Role::getName))
                .map(this::toResponse)
                .toList();
    }

    public RoleResponse create(RoleRequest request) {
        String normalizedName = request.getName().trim().toUpperCase();
        if (roleRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists: " + normalizedName);
        }

        Role role = new Role();
        role.setName(normalizedName);
        role.setPermissions(parsePermissions(request.getPermissions()));
        return toResponse(roleRepository.save(role));
    }

    public RoleResponse update(Long id, RoleRequest request) {
        Role role = findOrThrow(id);
        String normalizedName = request.getName().trim().toUpperCase();

        roleRepository.findByNameIgnoreCase(normalizedName)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists: " + normalizedName);
                });

        role.setName(normalizedName);
        role.setPermissions(parsePermissions(request.getPermissions()));
        return toResponse(roleRepository.save(role));
    }

    public void delete(Long id) {
        Role role = findOrThrow(id);
        if ("SUPER_ADMIN".equalsIgnoreCase(role.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SUPER_ADMIN role cannot be deleted");
        }
        if (userRepository.existsByRoleId(role.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role is assigned to users and cannot be deleted");
        }
        roleRepository.delete(role);
    }

    public List<PermissionResponse> listPermissions() {
        return EnumSet.allOf(Permission.class).stream()
                .sorted(Comparator.comparing(Enum::name))
                .map(p -> new PermissionResponse(p.name()))
                .toList();
    }

    public Role findByNameOrThrow(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        return roleRepository.findByNameIgnoreCase(roleName.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleName));
    }

    private Role findOrThrow(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
    }

    private Set<Permission> parsePermissions(Set<String> permissions) {
        return permissions.stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(String::toUpperCase)
                .map(value -> {
                    try {
                        return Permission.valueOf(value);
                    } catch (IllegalArgumentException e) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid permission: " + value);
                    }
                })
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(Permission.class)));
    }

    private RoleResponse toResponse(Role role) {
        List<String> permissions = role.getPermissions().stream()
                .map(Enum::name)
                .sorted()
                .toList();
        return new RoleResponse(role.getId(), role.getName(), permissions);
    }
}
