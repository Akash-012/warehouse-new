package com.warehouse.wms.controller;

import com.warehouse.wms.dto.*;
import com.warehouse.wms.entity.*;
import com.warehouse.wms.mapper.BinMapper;
import com.warehouse.wms.repository.*;
import com.warehouse.wms.repository.SkuRepository;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.CONFLICT;

@RestController
@RequestMapping("/api/master")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('MASTER_VIEW')")
public class MasterDataController {

    private final WarehouseRepository warehouseRepository;
    private final ZoneRepository zoneRepository;
    private final AisleRepository aisleRepository;
    private final RackRepository rackRepository;
    private final BinRepository binRepository;
    private final BinMapper binMapper;
    private final SkuRepository skuRepository;

    @Operation(summary = "Create warehouse")
    @PostMapping("/warehouses")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Warehouse> createWarehouse(@Valid @RequestBody WarehouseRequest request) {
        Warehouse warehouse = new Warehouse();
        warehouse.setName(request.getName());
        warehouse.setLocation(request.getLocation());
        return ResponseEntity.ok(warehouseRepository.save(warehouse));
    }

    @Operation(summary = "List warehouses")
    @GetMapping("/warehouses")
    public ResponseEntity<List<Warehouse>> listWarehouses() {
        return ResponseEntity.ok(warehouseRepository.findAll());
    }

    @Operation(summary = "Get warehouse by id")
    @GetMapping("/warehouses/{id}")
    public ResponseEntity<Warehouse> getWarehouse(@PathVariable Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + id));
        return ResponseEntity.ok(warehouse);
    }

    @Operation(summary = "Update warehouse")
    @PutMapping("/warehouses/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Warehouse> updateWarehouse(@PathVariable Long id, @Valid @RequestBody WarehouseRequest request) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + id));
        warehouse.setName(request.getName());
        warehouse.setLocation(request.getLocation());
        return ResponseEntity.ok(warehouseRepository.save(warehouse));
    }

    @Operation(summary = "Delete warehouse")
    @DeleteMapping("/warehouses/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Void> deleteWarehouse(@PathVariable Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new EntityNotFoundException("Warehouse not found: " + id);
        }
        warehouseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Create zone")
    @PostMapping("/zones")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Map<String, Object>> createZone(@Valid @RequestBody ZoneRequest request) {
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + request.getWarehouseId()));
        Zone zone = new Zone();
        zone.setName(request.getName());
        zone.setWarehouse(warehouse);
        return ResponseEntity.ok(toZoneView(zoneRepository.save(zone)));
    }

    @Operation(summary = "List zones")
    @GetMapping("/zones")
    public ResponseEntity<List<Map<String, Object>>> listZones() {
        return ResponseEntity.ok(zoneRepository.findAll().stream().map(this::toZoneView).toList());
    }

    @Operation(summary = "Get zone by id")
    @GetMapping("/zones/{id}")
    public ResponseEntity<Map<String, Object>> getZone(@PathVariable Long id) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + id));
        return ResponseEntity.ok(toZoneView(zone));
    }

    @Operation(summary = "Update zone")
    @PutMapping("/zones/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Map<String, Object>> updateZone(@PathVariable Long id, @Valid @RequestBody ZoneRequest request) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + id));
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + request.getWarehouseId()));
        zone.setName(request.getName());
        zone.setWarehouse(warehouse);
        return ResponseEntity.ok(toZoneView(zoneRepository.save(zone)));
    }

    @Operation(summary = "Delete zone")
    @DeleteMapping("/zones/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Void> deleteZone(@PathVariable Long id) {
        if (!zoneRepository.existsById(id)) {
            throw new EntityNotFoundException("Zone not found: " + id);
        }
        zoneRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Create aisle")
    @PostMapping("/aisles")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Map<String, Object>> createAisle(@Valid @RequestBody AisleRequest request) {
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + request.getZoneId()));
        Aisle aisle = new Aisle();
        aisle.setAisleNumber(request.getAisleNumber());
        aisle.setZone(zone);
        return ResponseEntity.ok(toAisleView(aisleRepository.save(aisle)));
    }

    @Operation(summary = "List aisles")
    @GetMapping("/aisles")
    public ResponseEntity<List<Map<String, Object>>> listAisles() {
        return ResponseEntity.ok(aisleRepository.findAll().stream().map(this::toAisleView).toList());
    }

    @Operation(summary = "Get aisle by id")
    @GetMapping("/aisles/{id}")
    public ResponseEntity<Map<String, Object>> getAisle(@PathVariable Long id) {
        Aisle aisle = aisleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + id));
        return ResponseEntity.ok(toAisleView(aisle));
    }

    @Operation(summary = "Update aisle")
    @PutMapping("/aisles/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Map<String, Object>> updateAisle(@PathVariable Long id, @Valid @RequestBody AisleRequest request) {
        Aisle aisle = aisleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + id));
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + request.getZoneId()));
        aisle.setAisleNumber(request.getAisleNumber());
        aisle.setZone(zone);
        return ResponseEntity.ok(toAisleView(aisleRepository.save(aisle)));
    }

    @Operation(summary = "Delete aisle")
    @DeleteMapping("/aisles/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Void> deleteAisle(@PathVariable Long id) {
        if (!aisleRepository.existsById(id)) {
            throw new EntityNotFoundException("Aisle not found: " + id);
        }
        aisleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Create rack")
    @PostMapping("/racks")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Map<String, Object>> createRack(@Valid @RequestBody RackRequest request) {
        Aisle aisle = aisleRepository.findById(request.getAisleId())
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + request.getAisleId()));
        Rack rack = new Rack();
        rack.setRackIdentifier(request.getRackIdentifier());
        rack.setAisle(aisle);
        return ResponseEntity.ok(toRackView(rackRepository.save(rack)));
    }

    @Operation(summary = "List racks")
    @GetMapping("/racks")
    public ResponseEntity<List<Map<String, Object>>> listRacks() {
        return ResponseEntity.ok(rackRepository.findAll().stream().map(this::toRackView).toList());
    }

    @Operation(summary = "Get rack by id")
    @GetMapping("/racks/{id}")
    public ResponseEntity<Map<String, Object>> getRack(@PathVariable Long id) {
        Rack rack = rackRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rack not found: " + id));
        return ResponseEntity.ok(toRackView(rack));
    }

    @Operation(summary = "Update rack")
    @PutMapping("/racks/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Map<String, Object>> updateRack(@PathVariable Long id, @Valid @RequestBody RackRequest request) {
        Rack rack = rackRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rack not found: " + id));
        Aisle aisle = aisleRepository.findById(request.getAisleId())
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + request.getAisleId()));
        rack.setRackIdentifier(request.getRackIdentifier());
        rack.setAisle(aisle);
        return ResponseEntity.ok(toRackView(rackRepository.save(rack)));
    }

    private Map<String, Object> toZoneView(Zone zone) {
        Map<String, Object> warehouse = new LinkedHashMap<>();
        warehouse.put("id", zone.getWarehouse().getId());
        warehouse.put("name", zone.getWarehouse().getName());
        warehouse.put("location", zone.getWarehouse().getLocation());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", zone.getId());
        out.put("name", zone.getName());
        out.put("warehouse", warehouse);
        return out;
    }

    private Map<String, Object> toAisleView(Aisle aisle) {
        Map<String, Object> zone = toZoneView(aisle.getZone());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", aisle.getId());
        out.put("aisleNumber", aisle.getAisleNumber());
        out.put("zone", zone);
        return out;
    }

    private Map<String, Object> toRackView(Rack rack) {
        Map<String, Object> aisle = toAisleView(rack.getAisle());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", rack.getId());
        out.put("rackIdentifier", rack.getRackIdentifier());
        out.put("aisle", aisle);
        return out;
    }

    @Operation(summary = "Delete rack")
    @DeleteMapping("/racks/{id}")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Void> deleteRack(@PathVariable Long id) {
        if (!rackRepository.existsById(id)) {
            throw new EntityNotFoundException("Rack not found: " + id);
        }
        rackRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Create bin")
    @PostMapping("/bins")
    public ResponseEntity<BinResponse> createBin(@Valid @RequestBody BinCreateRequest request) {
        if (binRepository.existsByBarcode(request.getBarcode())) {
            throw new ResponseStatusException(CONFLICT, "Bin barcode already exists: " + request.getBarcode());
        }
        Rack rack = rackRepository.findById(request.getRackId())
                .orElseThrow(() -> new EntityNotFoundException("Rack not found: " + request.getRackId()));
        Bin bin = binMapper.toEntity(request);
        bin.setRack(rack);
        return ResponseEntity.ok(binMapper.toResponse(binRepository.save(bin)));
    }

    @Operation(summary = "Get bin by barcode with utilization")
    @GetMapping("/bins/{barcode}")
    public ResponseEntity<BinResponse> getBin(@PathVariable String barcode) {
        Bin bin = binRepository.findByBarcode(barcode)
                .orElseThrow(() -> new EntityNotFoundException("Bin not found: " + barcode));
        return ResponseEntity.ok(binMapper.toResponse(bin));
    }

    @Operation(summary = "List bins")
    @GetMapping("/bins")
    public ResponseEntity<List<BinResponse>> listBins() {
        return ResponseEntity.ok(binRepository.findAll().stream().map(binMapper::toResponse).toList());
    }

    @Operation(summary = "List all SKUs")
    @GetMapping("/skus")
    public ResponseEntity<List<Map<String, Object>>> listSkus() {
        return ResponseEntity.ok(skuRepository.findAll().stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",          s.getId());
            m.put("skuCode",     s.getSkuCode());
            m.put("description", s.getDescription());
            m.put("category",    s.getCategory());
            m.put("lowStockThreshold", s.getLowStockThreshold());
            return m;
        }).toList());
    }

    @Operation(summary = "Update SKU category")
    @PutMapping("/skus/{id}/category")
    @PreAuthorize("hasAuthority('MASTER_MANAGE')")
    public ResponseEntity<Map<String, Object>> updateSkuCategory(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Sku sku = skuRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("SKU not found: " + id));
        Object val = body.get("category");
        sku.setCategory(val == null || val.toString().isBlank() ? null : val.toString());
        skuRepository.save(sku);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", sku.getId());
        resp.put("skuCode", sku.getSkuCode());
        resp.put("category", sku.getCategory());
        return ResponseEntity.ok(resp);
    }

    @Operation(summary = "Update bin")
    @PutMapping("/bins/{id}")
    public ResponseEntity<BinResponse> updateBin(@PathVariable Long id, @Valid @RequestBody BinCreateRequest request) {
        Bin bin = binRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bin not found: " + id));
        Rack rack = rackRepository.findById(request.getRackId())
                .orElseThrow(() -> new EntityNotFoundException("Rack not found: " + request.getRackId()));

        if (!bin.getBarcode().equals(request.getBarcode()) && binRepository.existsByBarcode(request.getBarcode())) {
            throw new ResponseStatusException(CONFLICT, "Bin barcode already exists: " + request.getBarcode());
        }

        bin.setRack(rack);
        bin.setBarcode(request.getBarcode());
        bin.setLengthCm(request.getLengthCm());
        bin.setWidthCm(request.getWidthCm());
        bin.setHeightCm(request.getHeightCm());
        bin.setMaxWeightG(request.getMaxWeightG());
        bin.setStatus(request.getStatus());
        return ResponseEntity.ok(binMapper.toResponse(binRepository.save(bin)));
    }

    @Operation(summary = "Update bin status")
    @PutMapping("/bins/{id}/status")
    public ResponseEntity<BinResponse> updateBinStatus(@PathVariable Long id, @Valid @RequestBody BinStatusUpdateRequest request) {
        Bin bin = binRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bin not found: " + id));
        bin.setStatus(request.getStatus());
        return ResponseEntity.ok(binMapper.toResponse(binRepository.save(bin)));
    }

    @Operation(summary = "Delete bin")
    @DeleteMapping("/bins/{id}")
    public ResponseEntity<Void> deleteBin(@PathVariable Long id) {
        if (!binRepository.existsById(id)) {
            throw new EntityNotFoundException("Bin not found: " + id);
        }
        binRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
