package com.warehouse.wms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.Set;

@Data
public class RoleRequest {
    @NotBlank
    @Pattern(regexp = "^[A-Z_]+$", message = "Role name must be uppercase with underscores only")
    private String name;

    @NotEmpty
    private Set<@Pattern(regexp = "^[A-Z_]+$", message = "Permission must be uppercase with underscores only") String> permissions;
}
