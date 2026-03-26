package com.warehouse.wms.dto;

import com.warehouse.wms.entity.Bin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BinStatusUpdateRequest {
    @NotNull(message = "status is required")
    private Bin.BinStatus status;
}
