package com.warehouse.wms.config;

import com.warehouse.wms.entity.*;
import com.warehouse.wms.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final WarehouseRepository warehouseRepository;
    private final ZoneRepository zoneRepository;
    private final AisleRepository aisleRepository;
    private final RackRepository rackRepository;
    private final BinRepository binRepository;
    private final JdbcTemplate jdbc;

    public DataInitializer(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            WarehouseRepository warehouseRepository,
            ZoneRepository zoneRepository,
            AisleRepository aisleRepository,
            RackRepository rackRepository,
            BinRepository binRepository,
            JdbcTemplate jdbc) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.warehouseRepository = warehouseRepository;
        this.zoneRepository = zoneRepository;
        this.aisleRepository = aisleRepository;
        this.rackRepository = rackRepository;
        this.binRepository = binRepository;
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        if (warehouseRepository.count() == 0) seedWarehouseStructure();
        clearStalePutawayTasks();
        repairPutawayTaskPriorities();
        repairOverflowBinBarcode();
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    private void seedUsers() {
        seedDefaultRoles();
        repairInvalidUserRoleIds();
        seedUser("superadmin", "superadmin123", "SUPER_ADMIN");
        seedUser("admin",      "admin123",      "ADMIN");
        seedUser("manager",    "manager123",    "MANAGER");
        seedUser("worker",     "worker123",     "WORKER");
    }

    private void repairInvalidUserRoleIds() {
        // Repair legacy or corrupted role_id values (e.g. 0) before loading users as entities.
        jdbc.update("""
            UPDATE _user u
            JOIN wms_role r ON r.name = 'WORKER'
            LEFT JOIN wms_role existing ON existing.id = u.role_id
            SET u.role_id = r.id
            WHERE existing.id IS NULL
            """);

        // Keep seeded demo users mapped to expected default roles.
        jdbc.update("UPDATE _user u JOIN wms_role r ON r.name = 'SUPER_ADMIN' SET u.role_id = r.id WHERE u.username = 'superadmin'");
        jdbc.update("UPDATE _user u JOIN wms_role r ON r.name = 'ADMIN' SET u.role_id = r.id WHERE u.username = 'admin'");
        jdbc.update("UPDATE _user u JOIN wms_role r ON r.name = 'MANAGER' SET u.role_id = r.id WHERE u.username = 'manager'");
        jdbc.update("UPDATE _user u JOIN wms_role r ON r.name = 'WORKER' SET u.role_id = r.id WHERE u.username = 'worker'");
    }

    private void seedDefaultRoles() {
        upsertRole("SUPER_ADMIN", EnumSet.allOf(Permission.class));
        upsertRole("ADMIN", EnumSet.of(
                Permission.DASHBOARD_VIEW,
                Permission.INBOUND_VIEW, Permission.INBOUND_RECEIVE,
                Permission.INVENTORY_VIEW, Permission.INVENTORY_ADJUST,
                Permission.PUTAWAY_VIEW, Permission.PUTAWAY_EXECUTE,
                Permission.PICKING_VIEW, Permission.PICKING_EXECUTE,
                Permission.PACKING_VIEW, Permission.PACKING_EXECUTE,
                Permission.SHIPPING_VIEW, Permission.SHIPPING_CONFIRM,
                Permission.ORDERS_VIEW, Permission.ORDERS_CREATE,
                Permission.TROLLEYS_VIEW, Permission.TROLLEYS_CREATE, Permission.TROLLEYS_ASSIGN,
                Permission.LABELS_VIEW, Permission.LABELS_PRINT,
                Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
                Permission.MASTER_VIEW, Permission.MASTER_MANAGE,
                Permission.USERS_VIEW
        ));
        upsertRole("MANAGER", EnumSet.of(
                Permission.DASHBOARD_VIEW,
                Permission.INBOUND_VIEW, Permission.INBOUND_RECEIVE,
                Permission.INVENTORY_VIEW, Permission.INVENTORY_ADJUST,
                Permission.PUTAWAY_VIEW, Permission.PUTAWAY_EXECUTE,
                Permission.PICKING_VIEW, Permission.PICKING_EXECUTE,
                Permission.PACKING_VIEW, Permission.PACKING_EXECUTE,
                Permission.SHIPPING_VIEW, Permission.SHIPPING_CONFIRM,
                Permission.ORDERS_VIEW, Permission.ORDERS_CREATE,
                Permission.TROLLEYS_VIEW, Permission.TROLLEYS_CREATE, Permission.TROLLEYS_ASSIGN,
                Permission.LABELS_VIEW, Permission.LABELS_PRINT,
                Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
                Permission.MASTER_VIEW
        ));
        upsertRole("WORKER", EnumSet.of(
                Permission.DASHBOARD_VIEW,
                Permission.INBOUND_VIEW,
                Permission.INVENTORY_VIEW,
                Permission.PUTAWAY_VIEW, Permission.PUTAWAY_EXECUTE,
                Permission.PICKING_VIEW, Permission.PICKING_EXECUTE,
                Permission.PACKING_VIEW, Permission.PACKING_EXECUTE,
                Permission.TROLLEYS_VIEW, Permission.TROLLEYS_CREATE, Permission.TROLLEYS_ASSIGN,
                Permission.LABELS_VIEW, Permission.LABELS_PRINT
        ));
    }

    private void upsertRole(String roleName, EnumSet<Permission> permissions) {
        Role role = roleRepository.findByNameIgnoreCase(roleName).orElseGet(Role::new);
        role.setName(roleName);
        role.setPermissions(EnumSet.copyOf(permissions));
        roleRepository.save(role);
    }

    private void seedUser(String username, String password, String roleName) {
        User u = userRepository.findByUsername(username).orElseGet(User::new);
        Role role = roleRepository.findByName(roleName).orElseThrow();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode(password));
        u.setRole(role);
        userRepository.save(u);
    }

    // ── Warehouse Structure ────────────────────────────────────────────────────
    private void seedWarehouseStructure() {
        Warehouse wh = new Warehouse();
        wh.setName("Main Warehouse");
        wh.setLocation("40 Industrial Ave, Chicago IL");
        wh = warehouseRepository.save(wh);

        Aisle[] aisles = new Aisle[4];
        String[][] zoneAisles = {
            {"Zone A – Ambient",      "A1", "A2"},
            {"Zone B – Refrigerated", "B1", "B2"}
        };
        int aisleIdx = 0;
        for (String[] za : zoneAisles) {
            Zone zone = new Zone();
            zone.setName(za[0]);
            zone.setWarehouse(wh);
            zone = zoneRepository.save(zone);
            for (int i = 1; i < za.length; i++) {
                Aisle aisle = new Aisle();
                aisle.setAisleNumber(za[i]);
                aisle.setZone(zone);
                aisles[aisleIdx++] = aisleRepository.save(aisle);
            }
        }

        // 2 racks per aisle = 8 racks, 5 bins per rack = 40 bins
        String[] rackLabels = {"A1-R1","A1-R2","A2-R1","A2-R2","B1-R1","B1-R2","B2-R1","B2-R2"};
        int rIdx = 0;
        for (Aisle aisle : aisles) {
            for (int r = 1; r <= 2; r++) {
                Rack rack = new Rack();
                rack.setRackIdentifier(rackLabels[rIdx]);
                rack.setAisle(aisle);
                rack = rackRepository.save(rack);
                for (int b = 1; b <= 5; b++) {
                    Bin bin = new Bin();
                    bin.setBarcode(String.format("BIN-%s-%02d", rackLabels[rIdx], b));
                    bin.setRack(rack);
                    bin.setLengthCm(BigDecimal.valueOf(60));
                    bin.setWidthCm(BigDecimal.valueOf(40));
                    bin.setHeightCm(BigDecimal.valueOf(30));
                    bin.setMaxWeightG(BigDecimal.valueOf(25000));
                    bin.setOccupiedVolumeCm3(BigDecimal.ZERO);
                    bin.setOccupiedWeightG(BigDecimal.ZERO);
                    bin.setStatus(Bin.BinStatus.AVAILABLE);
                    binRepository.save(bin);
                }
                rIdx++;
            }
        }
        System.out.println("[DataInitializer] Seeded warehouse: 1 warehouse, 2 zones, 4 aisles, 8 racks, 40 bins");
    }

    // ── Clear stale putaway tasks (orphaned PENDING tasks with no valid inventory) ─
    private void clearStalePutawayTasks() {
        jdbc.update("""
            DELETE pt FROM putaway_task pt
            JOIN inventory i ON i.id = pt.inventory_id
            WHERE pt.status = 'PENDING'
            AND i.state NOT IN ('IN_PUTAWAY', 'RECEIVED')
            """);
        System.out.println("[DataInitializer] Cleared stale PENDING putaway tasks");
    }

    // ── Repair putaway task priorities from PO priority (P1=1, P2=2, P3=3) ─
    private void repairPutawayTaskPriorities() {
        int updated = jdbc.update("""
            UPDATE putaway_task pt
            JOIN inventory i ON i.id = pt.inventory_id
            JOIN goods_receipt_line grl ON grl.id = i.goods_receipt_line_id
            JOIN goods_receipt gr ON gr.id = grl.goods_receipt_id
            JOIN purchase_order po ON po.id = gr.purchase_order_id
            SET pt.priority = CASE po.priority
                WHEN 'P1' THEN 1
                WHEN 'P2' THEN 2
                WHEN 'P3' THEN 3
                ELSE 2
            END
            WHERE pt.status = 'PENDING'
            AND pt.priority != CASE po.priority
                WHEN 'P1' THEN 1
                WHEN 'P2' THEN 2
                WHEN 'P3' THEN 3
                ELSE 2
            END
            """);
        if (updated > 0) {
            System.out.println("[DataInitializer] Repaired " + updated + " putaway task priorities from PO");
        }
    }

    // ── Rename legacy OVERFLOW bin to STAGING-AREA ─
    private void repairOverflowBinBarcode() {
        int updated = jdbc.update("UPDATE bin SET barcode = 'STAGING-AREA' WHERE barcode = 'OVERFLOW'");
        if (updated > 0) {
            System.out.println("[DataInitializer] Renamed OVERFLOW bin to STAGING-AREA");
        }
    }

}
