package com.warehouse.wms.controller;

import com.warehouse.wms.dto.*;
import com.warehouse.wms.entity.*;
import com.warehouse.wms.mapper.BinMapper;
import com.warehouse.wms.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.CONFLICT;

@RestController
@RequestMapping("/api/master")
@RequiredArgsConstructor
public class MasterDataController {

    private final WarehouseRepository warehouseRepository;
    private final ZoneRepository zoneRepository;
    private final AisleRepository aisleRepository;
    private final RackRepository rackRepository;
    private final BinRepository binRepository;
    private final BinMapper binMapper;

    @Operation(summary = "Create warehouse")
    @PostMapping("/warehouses")
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
    public ResponseEntity<Warehouse> updateWarehouse(@PathVariable Long id, @Valid @RequestBody WarehouseRequest request) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + id));
        warehouse.setName(request.getName());
        warehouse.setLocation(request.getLocation());
        return ResponseEntity.ok(warehouseRepository.save(warehouse));
    }

    @Operation(summary = "Delete warehouse")
    @DeleteMapping("/warehouses/{id}")
    public ResponseEntity<Void> deleteWarehouse(@PathVariable Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new EntityNotFoundException("Warehouse not found: " + id);
        }
        warehouseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Create zone")
    @PostMapping("/zones")
    public ResponseEntity<Zone> createZone(@Valid @RequestBody ZoneRequest request) {
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + request.getWarehouseId()));
        Zone zone = new Zone();
        zone.setName(request.getName());
        zone.setWarehouse(warehouse);
        return ResponseEntity.ok(zoneRepository.save(zone));
    }

    @Operation(summary = "List zones")
    @GetMapping("/zones")
    public ResponseEntity<List<Zone>> listZones() {
        return ResponseEntity.ok(zoneRepository.findAll());
    }

    @Operation(summary = "Get zone by id")
    @GetMapping("/zones/{id}")
    public ResponseEntity<Zone> getZone(@PathVariable Long id) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + id));
        return ResponseEntity.ok(zone);
    }

    @Operation(summary = "Update zone")
    @PutMapping("/zones/{id}")
    public ResponseEntity<Zone> updateZone(@PathVariable Long id, @Valid @RequestBody ZoneRequest request) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + id));
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found: " + request.getWarehouseId()));
        zone.setName(request.getName());
        zone.setWarehouse(warehouse);
        return ResponseEntity.ok(zoneRepository.save(zone));
    }

    @Operation(summary = "Delete zone")
    @DeleteMapping("/zones/{id}")
    public ResponseEntity<Void> deleteZone(@PathVariable Long id) {
        if (!zoneRepository.existsById(id)) {
            throw new EntityNotFoundException("Zone not found: " + id);
        }
        zoneRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Create aisle")
    @PostMapping("/aisles")
    public ResponseEntity<Aisle> createAisle(@Valid @RequestBody AisleRequest request) {
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + request.getZoneId()));
        Aisle aisle = new Aisle();
        aisle.setAisleNumber(request.getAisleNumber());
        aisle.setZone(zone);
        return ResponseEntity.ok(aisleRepository.save(aisle));
    }

    @Operation(summary = "List aisles")
    @GetMapping("/aisles")
    public ResponseEntity<List<Aisle>> listAisles() {
        return ResponseEntity.ok(aisleRepository.findAll());
    }

    @Operation(summary = "Get aisle by id")
    @GetMapping("/aisles/{id}")
    public ResponseEntity<Aisle> getAisle(@PathVariable Long id) {
        Aisle aisle = aisleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + id));
        return ResponseEntity.ok(aisle);
    }

    @Operation(summary = "Update aisle")
    @PutMapping("/aisles/{id}")
    public ResponseEntity<Aisle> updateAisle(@PathVariable Long id, @Valid @RequestBody AisleRequest request) {
        Aisle aisle = aisleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + id));
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new EntityNotFoundException("Zone not found: " + request.getZoneId()));
        aisle.setAisleNumber(request.getAisleNumber());
        aisle.setZone(zone);
        return ResponseEntity.ok(aisleRepository.save(aisle));
    }

    @Operation(summary = "Delete aisle")
    @DeleteMapping("/aisles/{id}")
    public ResponseEntity<Void> deleteAisle(@PathVariable Long id) {
        if (!aisleRepository.existsById(id)) {
            throw new EntityNotFoundException("Aisle not found: " + id);
        }
        aisleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Create rack")
    @PostMapping("/racks")
    public ResponseEntity<Rack> createRack(@Valid @RequestBody RackRequest request) {
        Aisle aisle = aisleRepository.findById(request.getAisleId())
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + request.getAisleId()));
        Rack rack = new Rack();
        rack.setRackIdentifier(request.getRackIdentifier());
        rack.setAisle(aisle);
        return ResponseEntity.ok(rackRepository.save(rack));
    }

    @Operation(summary = "List racks")
    @GetMapping("/racks")
    public ResponseEntity<List<Rack>> listRacks() {
        return ResponseEntity.ok(rackRepository.findAll());
    }

    @Operation(summary = "Get rack by id")
    @GetMapping("/racks/{id}")
    public ResponseEntity<Rack> getRack(@PathVariable Long id) {
        Rack rack = rackRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rack not found: " + id));
        return ResponseEntity.ok(rack);
    }

    @Operation(summary = "Update rack")
    @PutMapping("/racks/{id}")
    public ResponseEntity<Rack> updateRack(@PathVariable Long id, @Valid @RequestBody RackRequest request) {
        Rack rack = rackRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rack not found: " + id));
        Aisle aisle = aisleRepository.findById(request.getAisleId())
                .orElseThrow(() -> new EntityNotFoundException("Aisle not found: " + request.getAisleId()));
        rack.setRackIdentifier(request.getRackIdentifier());
        rack.setAisle(aisle);
        return ResponseEntity.ok(rackRepository.save(rack));
    }

    @Operation(summary = "Delete rack")
    @DeleteMapping("/racks/{id}")
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
