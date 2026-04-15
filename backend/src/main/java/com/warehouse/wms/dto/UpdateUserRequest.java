package com.warehouse.wms.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String username;
    private String role;
    private String password; // optional – only updated if non-blank
}
