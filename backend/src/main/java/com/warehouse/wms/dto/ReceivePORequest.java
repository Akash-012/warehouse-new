package com.warehouse.wms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ReceivePORequest {
    @NotNull(message = "poId is required")
    private Long poId;

    @Valid
    @NotEmpty(message = "lines are required")
    private List<ReceivePOLineRequest> lines;
}
