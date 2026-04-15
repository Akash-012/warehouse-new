package com.warehouse.wms.config;

import com.warehouse.wms.entity.*;
import com.warehouse.wms.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final SkuRepository skuRepository;
    private final SkuDimensionRepository skuDimensionRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderLineRepository purchaseOrderLineRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final SalesOrderLineRepository salesOrderLineRepository;
    private final InventoryRepository inventoryRepository;
    private final ShipmentRecordRepository shipmentRecordRepository;
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
            SkuRepository skuRepository,
            SkuDimensionRepository skuDimensionRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseOrderLineRepository purchaseOrderLineRepository,
            SalesOrderRepository salesOrderRepository,
            SalesOrderLineRepository salesOrderLineRepository,
            InventoryRepository inventoryRepository,
            ShipmentRecordRepository shipmentRecordRepository,
            JdbcTemplate jdbc) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.warehouseRepository = warehouseRepository;
        this.zoneRepository = zoneRepository;
        this.aisleRepository = aisleRepository;
        this.rackRepository = rackRepository;
        this.binRepository = binRepository;
        this.skuRepository = skuRepository;
        this.skuDimensionRepository = skuDimensionRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderLineRepository = purchaseOrderLineRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.salesOrderLineRepository = salesOrderLineRepository;
        this.inventoryRepository = inventoryRepository;
        this.shipmentRecordRepository = shipmentRecordRepository;
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        if (warehouseRepository.count() == 0) seedWarehouseStructure();
        if (skuRepository.count() == 0)       seedSkus();
        if (purchaseOrderRepository.count() == 0) seedPurchaseOrders();
        seedTestPurchaseOrders();
        clearStalePutawayTasks();
        if (salesOrderRepository.count() == 0)    seedSalesOrdersAndShipments();
        if (inventoryRepository.count() == 0)     seedInventory();
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

    // ── SKUs ──────────────────────────────────────────────────────────────────
    private static final Object[][] SKU_DATA = {
        {"SKU-001", "Laptop 15\"",        38, 26,  3, 2100},
        {"SKU-002", "Wireless Mouse",     12,  8,  4,  120},
        {"SKU-003", "USB-C Hub 7-port",   12,  8,  2,  180},
        {"SKU-004", "Mechanical Keyboard",44, 15,  4,  850},
        {"SKU-005", "Monitor 27\"",       65, 39,  6, 5200},
        {"SKU-006", "Webcam 1080p",       14, 10,  8,  280},
        {"SKU-007", "Headset USB",        20, 18,  8,  320},
        {"SKU-008", "Laptop Stand",       26, 22,  4,  380},
        {"SKU-009", "External SSD 1TB",   14,  8,  1,  130},
        {"SKU-010", "Docking Station",    22, 18, 10,  920},
    };

    private void seedSkus() {
        for (Object[] row : SKU_DATA) {
            Sku sku = new Sku();
            sku.setSkuCode((String) row[0]);
            sku.setDescription((String) row[1]);
            sku = skuRepository.save(sku);

            SkuDimension dim = new SkuDimension();
            dim.setSku(sku);
            dim.setLengthCm(BigDecimal.valueOf((int) row[2]));
            dim.setWidthCm(BigDecimal.valueOf((int) row[3]));
            dim.setHeightCm(BigDecimal.valueOf((int) row[4]));
            dim.setWeightG(BigDecimal.valueOf((int) row[5]));
            skuDimensionRepository.save(dim);
        }
        System.out.println("[DataInitializer] Seeded 10 SKUs with dimensions");
    }

    // ── Purchase Orders ────────────────────────────────────────────────────────
    private void seedPurchaseOrders() {
        List<Sku> skus = skuRepository.findAll();
        if (skus.size() < 10) return;

        PurchaseOrder po1 = new PurchaseOrder();
        po1.setPoNumber("PO-2026-001");
        po1.setSupplier("TechSupply Co.");
        po1.setExpectedArrivalDate(LocalDate.now().plusDays(5));
        po1.setStatus("OPEN");
        po1.setPriority(PurchaseOrder.Priority.P1);
        po1 = purchaseOrderRepository.save(po1);

        int[][] po1Lines = {{0,50},{1,200},{2,100},{3,80},{4,20}};
        for (int[] l : po1Lines) savePOLine(po1, skus.get(l[0]), l[1]);

        PurchaseOrder po2 = new PurchaseOrder();
        po2.setPoNumber("PO-2026-002");
        po2.setSupplier("Global Parts Ltd.");
        po2.setExpectedArrivalDate(LocalDate.now().plusDays(10));
        po2.setStatus("OPEN");
        po2.setPriority(PurchaseOrder.Priority.P2);
        po2 = purchaseOrderRepository.save(po2);

        int[][] po2Lines = {{5,150},{6,100},{7,80},{8,200},{9,60}};
        for (int[] l : po2Lines) savePOLine(po2, skus.get(l[0]), l[1]);

        System.out.println("[DataInitializer] Seeded 2 purchase orders with lines");
    }

    private void savePOLine(PurchaseOrder po, Sku sku, int qty) {
        PurchaseOrderLine line = new PurchaseOrderLine();
        line.setPurchaseOrder(po);
        line.setSku(sku);
        line.setQuantity(qty);
        purchaseOrderLineRepository.save(line);
    }

    // ── Test Purchase Orders (4 pending for inbound/putaway/inventory testing) ─
    private void seedTestPurchaseOrders() {
        List<Sku> skus = skuRepository.findAll();
        if (skus.size() < 10) return;

        if (!purchaseOrderRepository.existsByPoNumber("PO-TEST-001")) {
            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-TEST-001");
            po.setSupplier("Test Supplier A");
            po.setExpectedArrivalDate(LocalDate.now().plusDays(2));
            po.setStatus("PENDING");
            po.setPriority(PurchaseOrder.Priority.P1);
            po = purchaseOrderRepository.save(po);
            savePOLine(po, skus.get(0), 3);  // SKU-001 Laptop 15"
            savePOLine(po, skus.get(1), 5);  // SKU-002 Wireless Mouse
            System.out.println("[DataInitializer] Seeded PO-TEST-001");
        }

        if (!purchaseOrderRepository.existsByPoNumber("PO-TEST-002")) {
            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-TEST-002");
            po.setSupplier("Test Supplier B");
            po.setExpectedArrivalDate(LocalDate.now().plusDays(3));
            po.setStatus("PENDING");
            po.setPriority(PurchaseOrder.Priority.P2);
            po = purchaseOrderRepository.save(po);
            savePOLine(po, skus.get(2), 4);  // SKU-003 USB-C Hub
            savePOLine(po, skus.get(3), 2);  // SKU-004 Mechanical Keyboard
            System.out.println("[DataInitializer] Seeded PO-TEST-002");
        }

        if (!purchaseOrderRepository.existsByPoNumber("PO-TEST-003")) {
            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-TEST-003");
            po.setSupplier("Test Supplier C");
            po.setExpectedArrivalDate(LocalDate.now().plusDays(4));
            po.setStatus("PENDING");
            po = purchaseOrderRepository.save(po);
            savePOLine(po, skus.get(5), 6);  // SKU-006 Webcam 1080p
            savePOLine(po, skus.get(8), 3);  // SKU-009 External SSD 1TB
            System.out.println("[DataInitializer] Seeded PO-TEST-003");
        }

        if (!purchaseOrderRepository.existsByPoNumber("PO-TEST-004")) {
            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-TEST-004");
            po.setSupplier("Test Supplier D");
            po.setExpectedArrivalDate(LocalDate.now().plusDays(5));
            po.setStatus("PENDING");
            po = purchaseOrderRepository.save(po);
            savePOLine(po, skus.get(6), 4);  // SKU-007 Headset USB
            savePOLine(po, skus.get(9), 3);  // SKU-010 Docking Station
            System.out.println("[DataInitializer] Seeded PO-TEST-004");
        }

        if (!purchaseOrderRepository.existsByPoNumber("PO-TEST-005")) {
            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-TEST-005");
            po.setSupplier("Rapid Electronics Ltd.");
            po.setExpectedArrivalDate(LocalDate.now().plusDays(6));
            po.setStatus("PENDING");
            po = purchaseOrderRepository.save(po);
            savePOLine(po, skus.get(4), 10); // SKU-005 Monitor 27"
            savePOLine(po, skus.get(7), 8);  // SKU-008 Laptop Stand
            savePOLine(po, skus.get(0), 5);  // SKU-001 Laptop 15"
            System.out.println("[DataInitializer] Seeded PO-TEST-005");
        }

        if (!purchaseOrderRepository.existsByPoNumber("PO-TEST-006")) {
            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-TEST-006");
            po.setSupplier("Prime Components Inc.");
            po.setExpectedArrivalDate(LocalDate.now().plusDays(7));
            po.setStatus("PENDING");
            po = purchaseOrderRepository.save(po);
            savePOLine(po, skus.get(1), 20); // SKU-002 Wireless Mouse
            savePOLine(po, skus.get(5), 15); // SKU-006 Webcam 1080p
            System.out.println("[DataInitializer] Seeded PO-TEST-006");
        }

        if (!purchaseOrderRepository.existsByPoNumber("PO-TEST-007")) {
            PurchaseOrder po = new PurchaseOrder();
            po.setPoNumber("PO-TEST-007");
            po.setSupplier("Vertex Hardware Co.");
            po.setExpectedArrivalDate(LocalDate.now().plusDays(8));
            po.setStatus("PENDING");
            po = purchaseOrderRepository.save(po);
            savePOLine(po, skus.get(3), 6);  // SKU-004 Mechanical Keyboard
            savePOLine(po, skus.get(8), 12); // SKU-009 External SSD 1TB
            savePOLine(po, skus.get(2), 9);  // SKU-003 USB-C Hub 7-port
            System.out.println("[DataInitializer] Seeded PO-TEST-007");
        }
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

    // ── Sales Orders & Shipments ───────────────────────────────────────────────
    private void seedSalesOrdersAndShipments() {
        List<Sku> skus = skuRepository.findAll();
        if (skus.size() < 10) return;

        // soNumber, customer, status, daysAgo
        String[][] orderData = {
            {"SO-2026-001", "Acme Corporation",    "SHIPPED",  "6"},
            {"SO-2026-002", "GlobalTech Ltd",      "SHIPPED",  "5"},
            {"SO-2026-003", "Metro Electronics",   "SHIPPED",  "3"},
            {"SO-2026-004", "DataCenter Pro",      "SHIPPED",  "1"},
            {"SO-2026-005", "StartupHub Inc",      "PACKING",  "0"},
            {"SO-2026-006", "TechVentures",        "PICKING",  "0"},
            {"SO-2026-007", "CloudBase Ltd",       "PENDING",  "0"},
            {"SO-2026-008", "NetSystems Ltd",      "PENDING",  "0"},
        };

        // {sku_index, qty} — 2 lines per order
        int[][] soLines = {
            {0,2},{1,5},  {2,3},{4,1},  {3,2},{5,4},  {6,3},{7,2},
            {0,1},{8,5},  {1,10},{2,7}, {4,2},{9,3},  {3,4},{6,2},
        };

        SalesOrder[] savedOrders = new SalesOrder[8];
        for (int i = 0; i < orderData.length; i++) {
            String[] d = orderData[i];
            int days = Integer.parseInt(d[3]);
            SalesOrder so = new SalesOrder();
            so.setSoNumber(d[0]);
            so.setCustomerName(d[1]);
            so.setOrderDate(LocalDate.now().minusDays(days));
            so.setStatus(d[2]);
            savedOrders[i] = salesOrderRepository.save(so);

            SalesOrderLine l1 = new SalesOrderLine();
            l1.setSalesOrder(savedOrders[i]);
            l1.setSku(skus.get(soLines[i * 2][0]));
            l1.setQuantity(soLines[i * 2][1]);
            salesOrderLineRepository.save(l1);

            SalesOrderLine l2 = new SalesOrderLine();
            l2.setSalesOrder(savedOrders[i]);
            l2.setSku(skus.get(soLines[i * 2 + 1][0]));
            l2.setQuantity(soLines[i * 2 + 1][1]);
            salesOrderLineRepository.save(l2);
        }

        // Backdate created_at for the 4 past orders so they don't appear as "today"
        for (int i = 0; i < 4; i++) {
            int days = Integer.parseInt(orderData[i][3]);
            LocalDateTime ts = LocalDateTime.now().minusDays(days).withHour(9).withMinute(0).withSecond(0).withNano(0);
            jdbc.update("UPDATE sales_order SET created_at = ? WHERE id = ?", ts, savedOrders[i].getId());
        }

        // Shipment records for SHIPPED orders, one per order, backdated to match
        String[] couriers = {"DHL", "FedEx", "UPS", "DHL"};
        for (int i = 0; i < 4; i++) {
            int days = Integer.parseInt(orderData[i][3]);
            ShipmentRecord sr = new ShipmentRecord();
            sr.setSalesOrder(savedOrders[i]);
            sr.setAwbNumber(String.format("AWB%04d%04d", i + 1, savedOrders[i].getId()));
            sr.setCourierName(couriers[i]);
            ShipmentRecord saved = shipmentRecordRepository.save(sr);
            LocalDateTime shipTs = LocalDateTime.now().minusDays(days).withHour(14).withMinute(0).withSecond(0).withNano(0);
            jdbc.update("UPDATE shipment_record SET created_at = ? WHERE id = ?", shipTs, saved.getId());
        }

        System.out.println("[DataInitializer] Seeded 8 sales orders + 4 shipment records");
    }

    // ── Inventory ─────────────────────────────────────────────────────────────
    private void seedInventory() {
        List<Sku> skus = skuRepository.findAll();
        List<Bin> bins = binRepository.findAll();
        if (skus.isEmpty() || bins.isEmpty()) return;

        // 60 AVAILABLE items spread across the first 20 bins (3 per bin)
        int binIdx = 0;
        for (int i = 0; i < 60; i++) {
            Sku sku = skus.get(i % skus.size());
            Bin bin = bins.get(binIdx % 20);
            if (i > 0 && i % 3 == 0) binIdx++;

            Inventory inv = new Inventory();
            inv.setSku(sku);
            inv.setBin(bin);
            inv.setQuantity(1);
            inv.setState(Inventory.InventoryState.AVAILABLE);
            inv.setBatchNo(String.format("BATCH-2026-%03d", (i / 10) + 1));
            inventoryRepository.save(inv);
        }

        // Mark first 20 bins as partially occupied (~20% utilization)
        jdbc.update("UPDATE bin SET occupied_volume_cm3 = 14400 WHERE id IN "
                + "(SELECT sub.id FROM (SELECT id FROM bin ORDER BY id LIMIT 20) sub)");

        // 20 SHIPPED items spread over past 7 days (powers the shipment area chart)
        for (int i = 0; i < 20; i++) {
            int daysAgo = (i % 6) + 1;
            Inventory inv = new Inventory();
            inv.setSku(skus.get(i % skus.size()));
            inv.setQuantity(1);
            inv.setState(Inventory.InventoryState.SHIPPED);
            inv.setBatchNo(String.format("BATCH-SHIP-%03d", i + 1));
            Inventory saved = inventoryRepository.save(inv);

            LocalDateTime ts = LocalDateTime.now().minusDays(daysAgo).withHour(11).withMinute(0).withSecond(0).withNano(0);
            jdbc.update("UPDATE inventory SET created_at = ?, updated_at = ? WHERE id = ?",
                    ts, ts, saved.getId());
        }

        System.out.println("[DataInitializer] Seeded 60 AVAILABLE + 20 SHIPPED inventory items");
    }
}
