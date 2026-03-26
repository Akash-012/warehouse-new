package com.warehouse.wms.mapper;

import com.warehouse.wms.dto.BinCreateRequest;
import com.warehouse.wms.dto.BinResponse;
import com.warehouse.wms.entity.Bin;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Mapper(componentModel = "spring")
public interface BinMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "rack", ignore = true)
    @Mapping(target = "volumeCm3", ignore = true)
    @Mapping(target = "occupiedVolumeCm3", constant = "0")
    @Mapping(target = "occupiedWeightG", constant = "0")
    Bin toEntity(BinCreateRequest request);

    @Mapping(target = "status", expression = "java(bin.getStatus().name())")
    @Mapping(target = "utilizationPct", expression = "java(calculateUtilization(bin))")
    BinResponse toResponse(Bin bin);

    default BigDecimal calculateUtilization(Bin bin) {
        if (bin.getVolumeCm3() == null || BigDecimal.ZERO.compareTo(bin.getVolumeCm3()) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal occupied = bin.getOccupiedVolumeCm3() == null ? BigDecimal.ZERO : bin.getOccupiedVolumeCm3();
        return occupied.multiply(BigDecimal.valueOf(100))
                .divide(bin.getVolumeCm3(), 2, RoundingMode.HALF_UP);
    }
}
