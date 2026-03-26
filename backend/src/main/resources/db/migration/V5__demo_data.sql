-- =============================================================
-- V5__demo_data.sql  –  Demo / seed data for WMS
-- =============================================================

-- ─────────────────────────────────────────
-- 1. WAREHOUSE STRUCTURE
-- ─────────────────────────────────────────
INSERT INTO warehouse (id, name, location) VALUES
  (1, 'Main Warehouse', '40 Industrial Ave, Chicago IL');

INSERT INTO zone (id, warehouse_id, name) VALUES
  (1, 1, 'Zone A – Ambient'),
  (2, 1, 'Zone B – Refrigerated');

INSERT INTO aisle (id, zone_id, aisle_number) VALUES
  (1, 1, 'A1'),
  (2, 1, 'A2'),
  (3, 2, 'B1'),
  (4, 2, 'B2');

INSERT INTO rack (id, aisle_id, rack_identifier) VALUES
  (1, 1, 'A1-R1'), (2, 1, 'A1-R2'),
  (3, 2, 'A2-R1'), (4, 2, 'A2-R2'),
  (5, 3, 'B1-R1'), (6, 3, 'B1-R2'),
  (7, 4, 'B2-R1'), (8, 4, 'B2-R2');

-- 5 bins per rack = 40 bins total
-- Dimensions: 60×40×30 cm (72 000 cm³), max 25 kg each
INSERT INTO bin (id, rack_id, barcode, length_cm, width_cm, height_cm, max_weight_g, occupied_volume_cm3, occupied_weight_g, status) VALUES
-- Rack 1 – A1-R1
  (1,  1, 'BIN-A1R1-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (2,  1, 'BIN-A1R1-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (3,  1, 'BIN-A1R1-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (4,  1, 'BIN-A1R1-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (5,  1, 'BIN-A1R1-05', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
-- Rack 2 – A1-R2
  (6,  2, 'BIN-A1R2-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (7,  2, 'BIN-A1R2-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (8,  2, 'BIN-A1R2-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (9,  2, 'BIN-A1R2-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (10, 2, 'BIN-A1R2-05', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
-- Rack 3 – A2-R1
  (11, 3, 'BIN-A2R1-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (12, 3, 'BIN-A2R1-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (13, 3, 'BIN-A2R1-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (14, 3, 'BIN-A2R1-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (15, 3, 'BIN-A2R1-05', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
-- Rack 4 – A2-R2
  (16, 4, 'BIN-A2R2-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (17, 4, 'BIN-A2R2-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (18, 4, 'BIN-A2R2-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (19, 4, 'BIN-A2R2-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (20, 4, 'BIN-A2R2-05', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
-- Rack 5 – B1-R1
  (21, 5, 'BIN-B1R1-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (22, 5, 'BIN-B1R1-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (23, 5, 'BIN-B1R1-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (24, 5, 'BIN-B1R1-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (25, 5, 'BIN-B1R1-05', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
-- Rack 6 – B1-R2
  (26, 6, 'BIN-B1R2-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (27, 6, 'BIN-B1R2-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (28, 6, 'BIN-B1R2-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (29, 6, 'BIN-B1R2-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (30, 6, 'BIN-B1R2-05', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
-- Rack 7 – B2-R1
  (31, 7, 'BIN-B2R1-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (32, 7, 'BIN-B2R1-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (33, 7, 'BIN-B2R1-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (34, 7, 'BIN-B2R1-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (35, 7, 'BIN-B2R1-05', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
-- Rack 8 – B2-R2
  (36, 8, 'BIN-B2R2-01', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (37, 8, 'BIN-B2R2-02', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (38, 8, 'BIN-B2R2-03', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (39, 8, 'BIN-B2R2-04', 60,40,30, 25000, 0, 0, 'AVAILABLE'),
  (40, 8, 'BIN-B2R2-05', 60,40,30, 25000, 0, 0, 'AVAILABLE');

-- ─────────────────────────────────────────
-- 2. SKUs
-- ─────────────────────────────────────────
INSERT INTO sku (id, sku_code, description) VALUES
  (1,  'SKU-WM01', 'Wireless Mouse – Ergonomic'),
  (2,  'SKU-KB02', 'USB Mechanical Keyboard'),
  (3,  'SKU-HD03', 'HDMI Cable 2m 4K'),
  (4,  'SKU-LS04', 'Laptop Stand – Adjustable Aluminium'),
  (5,  'SKU-MN05', 'Monitor 24" FHD IPS'),
  (6,  'SKU-WC06', 'Webcam HD 1080p'),
  (7,  'SKU-UC07', 'USB-C Hub 7-in-1'),
  (8,  'SKU-SS08', 'SSD 512 GB SATA'),
  (9,  'SKU-RM09', 'RAM 16 GB DDR4 3200 MHz'),
  (10, 'SKU-PB10', 'Power Bank 20 000 mAh');

INSERT INTO sku_dimension (id, sku_id, length_cm, width_cm, height_cm, weight_g) VALUES
  (1,  1,  12, 7,  4,   120),   -- mouse
  (2,  2,  44, 15, 4,   850),   -- keyboard
  (3,  3,  22, 3,  2,   180),   -- HDMI cable
  (4,  4,  30, 25, 4,   600),   -- laptop stand
  (5,  5,  56, 34, 6, 4200),    -- monitor
  (6,  6,  10, 8,  5,   160),   -- webcam
  (7,  7,  11, 6,  2,   110),   -- USB-C hub
  (8,  8,  10, 7,  1,   70),    -- SSD
  (9,  9,  14, 5,  3,   95),    -- RAM
  (10, 10, 15, 8,  3,   340);   -- power bank

-- ─────────────────────────────────────────
-- 3. PURCHASE ORDERS
-- ─────────────────────────────────────────
INSERT INTO purchase_order (id, po_number, supplier, expected_arrival_date, status) VALUES
  (1, 'PO-2026-001', 'TechSupply Co.',       '2026-03-10', 'RECEIVED'),
  (2, 'PO-2026-002', 'Digital Imports Ltd.', '2026-03-18', 'IN_RECEIVING'),
  (3, 'PO-2026-003', 'Gadget World',         '2026-03-25', 'PENDING');

INSERT INTO purchase_order_line (id, purchase_order_id, sku_id, quantity) VALUES
  -- PO-001: SKU 1,2,3 – 10 units each
  (1, 1, 1, 10), (2, 1, 2, 10), (3, 1, 3, 10),
  -- PO-002: SKU 4,5 – 5 units each
  (4, 2, 4,  5), (5, 2, 5,  5),
  -- PO-003: SKU 6,7,8 – 8 units each
  (6, 3, 6,  8), (7, 3, 7,  8), (8, 3, 8,  8);

-- ─────────────────────────────────────────
-- 4. GOODS RECEIPTS  (for PO-001 and PO-002)
-- ─────────────────────────────────────────
INSERT INTO goods_receipt (id, grn_no, purchase_order_id) VALUES
  (1, 'GRN-2026-001', 1),
  (2, 'GRN-2026-002', 2);

INSERT INTO goods_receipt_line (id, goods_receipt_id, sku_id, batch_no, quantity_received) VALUES
  -- GRN-001 lines (covering PO-001 items)
  (1, 1, 1, 'BATCH-WM-2603', 10),
  (2, 1, 2, 'BATCH-KB-2603', 10),
  (3, 1, 3, 'BATCH-HD-2603', 10),
  -- GRN-002 lines (covering PO-002 items)
  (4, 2, 4, 'BATCH-LS-2618',  5),
  (5, 2, 5, 'BATCH-MN-2618',  5);

-- ─────────────────────────────────────────
-- 5. INVENTORY
-- All from GRN-001 / GRN-002 are AVAILABLE in bins.
-- A few from GRN-002 are IN_PUTAWAY.  A few more RESERVED for sales orders.
-- Some extra SKU9/SKU10 RECEIVED (no GRN yet – represent pending receipts).
-- ─────────────────────────────────────────

-- SKU1 (mouse) – 10 units AVAILABLE in bins 1-10
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (1,  1,  1, 'BATCH-WM-2603', 'SN-WM-0001', 1, 'AVAILABLE', 1),
  (2,  1,  2, 'BATCH-WM-2603', 'SN-WM-0002', 1, 'AVAILABLE', 1),
  (3,  1,  3, 'BATCH-WM-2603', 'SN-WM-0003', 1, 'AVAILABLE', 1),
  (4,  1,  4, 'BATCH-WM-2603', 'SN-WM-0004', 1, 'AVAILABLE', 1),
  (5,  1,  5, 'BATCH-WM-2603', 'SN-WM-0005', 1, 'AVAILABLE', 1),
  (6,  1,  6, 'BATCH-WM-2603', 'SN-WM-0006', 1, 'AVAILABLE', 1),
  (7,  1,  7, 'BATCH-WM-2603', 'SN-WM-0007', 1, 'AVAILABLE', 1),
  -- 3 units RESERVED for sales order
  (8,  1,  8, 'BATCH-WM-2603', 'SN-WM-0008', 1, 'RESERVED',  1),
  (9,  1,  9, 'BATCH-WM-2603', 'SN-WM-0009', 1, 'RESERVED',  1),
  (10, 1, 10, 'BATCH-WM-2603', 'SN-WM-0010', 1, 'RESERVED',  1);

-- SKU2 (keyboard) – 10 units AVAILABLE in bins 11-20
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (11, 2, 11, 'BATCH-KB-2603', 'SN-KB-0001', 1, 'AVAILABLE', 2),
  (12, 2, 12, 'BATCH-KB-2603', 'SN-KB-0002', 1, 'AVAILABLE', 2),
  (13, 2, 13, 'BATCH-KB-2603', 'SN-KB-0003', 1, 'AVAILABLE', 2),
  (14, 2, 14, 'BATCH-KB-2603', 'SN-KB-0004', 1, 'AVAILABLE', 2),
  (15, 2, 15, 'BATCH-KB-2603', 'SN-KB-0005', 1, 'AVAILABLE', 2),
  (16, 2, 16, 'BATCH-KB-2603', 'SN-KB-0006', 1, 'AVAILABLE', 2),
  (17, 2, 17, 'BATCH-KB-2603', 'SN-KB-0007', 1, 'AVAILABLE', 2),
  (18, 2, 18, 'BATCH-KB-2603', 'SN-KB-0008', 1, 'AVAILABLE', 2),
  -- 2 RESERVED
  (19, 2, 19, 'BATCH-KB-2603', 'SN-KB-0009', 1, 'RESERVED',  2),
  (20, 2, 20, 'BATCH-KB-2603', 'SN-KB-0010', 1, 'RESERVED',  2);

-- SKU3 (HDMI cable) – 10 units AVAILABLE in bins 21-30
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (21, 3, 21, 'BATCH-HD-2603', 'SN-HD-0001', 1, 'AVAILABLE', 3),
  (22, 3, 22, 'BATCH-HD-2603', 'SN-HD-0002', 1, 'AVAILABLE', 3),
  (23, 3, 23, 'BATCH-HD-2603', 'SN-HD-0003', 1, 'AVAILABLE', 3),
  (24, 3, 24, 'BATCH-HD-2603', 'SN-HD-0004', 1, 'AVAILABLE', 3),
  (25, 3, 25, 'BATCH-HD-2603', 'SN-HD-0005', 1, 'AVAILABLE', 3),
  (26, 3, 26, 'BATCH-HD-2603', 'SN-HD-0006', 1, 'AVAILABLE', 3),
  (27, 3, 27, 'BATCH-HD-2603', 'SN-HD-0007', 1, 'AVAILABLE', 3),
  (28, 3, 28, 'BATCH-HD-2603', 'SN-HD-0008', 1, 'AVAILABLE', 3),
  (29, 3, 29, 'BATCH-HD-2603', 'SN-HD-0009', 1, 'AVAILABLE', 3),
  (30, 3, 30, 'BATCH-HD-2603', 'SN-HD-0010', 1, 'AVAILABLE', 3);

-- SKU4 (laptop stand) – 5 units, 3 AVAILABLE, 2 IN_PUTAWAY
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (31, 4, 31, 'BATCH-LS-2618', 'SN-LS-0001', 1, 'AVAILABLE',  4),
  (32, 4, 32, 'BATCH-LS-2618', 'SN-LS-0002', 1, 'AVAILABLE',  4),
  (33, 4, 33, 'BATCH-LS-2618', 'SN-LS-0003', 1, 'AVAILABLE',  4),
  (34, 4, NULL,'BATCH-LS-2618', 'SN-LS-0004', 1, 'IN_PUTAWAY', 4),
  (35, 4, NULL,'BATCH-LS-2618', 'SN-LS-0005', 1, 'IN_PUTAWAY', 4);

-- SKU5 (monitor) – 5 units AVAILABLE in bins 34-38
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (36, 5, 34, 'BATCH-MN-2618', 'SN-MN-0001', 1, 'AVAILABLE', 5),
  (37, 5, 35, 'BATCH-MN-2618', 'SN-MN-0002', 1, 'AVAILABLE', 5),
  (38, 5, 36, 'BATCH-MN-2618', 'SN-MN-0003', 1, 'AVAILABLE', 5),
  (39, 5, 37, 'BATCH-MN-2618', 'SN-MN-0004', 1, 'AVAILABLE', 5),
  (40, 5, 38, 'BATCH-MN-2618', 'SN-MN-0005', 1, 'AVAILABLE', 5);

-- SKU6 (webcam) – 4 units RECEIVED (no bin yet, arrived but not putaway)
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (41, 6, NULL, 'BATCH-WC-ON', 'SN-WC-0001', 1, 'RECEIVED', NULL),
  (42, 6, NULL, 'BATCH-WC-ON', 'SN-WC-0002', 1, 'RECEIVED', NULL),
  (43, 6, NULL, 'BATCH-WC-ON', 'SN-WC-0003', 1, 'RECEIVED', NULL),
  (44, 6, NULL, 'BATCH-WC-ON', 'SN-WC-0004', 1, 'RECEIVED', NULL);

-- SKU8 (SSD) – PICKED items showing an order in picking state
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (45, 8, 39, 'BATCH-SS-ONHAND', 'SN-SS-0001', 1, 'AVAILABLE', NULL),
  (46, 8, 40, 'BATCH-SS-ONHAND', 'SN-SS-0002', 1, 'AVAILABLE', NULL),
  (47, 8, NULL,'BATCH-SS-ONHAND', 'SN-SS-0003', 1, 'PICKED',   NULL),
  (48, 8, NULL,'BATCH-SS-ONHAND', 'SN-SS-0004', 1, 'PACKED',   NULL);

-- SKU9 (RAM) and SKU10 (Power Bank) – small stock on hand
INSERT INTO inventory (id, sku_id, bin_id, batch_no, serial_no, quantity, state, goods_receipt_line_id) VALUES
  (49, 9,  1,  'BATCH-RM-ONHAND', 'SN-RM-0001', 1, 'AVAILABLE', NULL),
  (50, 9,  2,  'BATCH-RM-ONHAND', 'SN-RM-0002', 1, 'AVAILABLE', NULL),
  (51, 10, 3,  'BATCH-PB-ONHAND', 'SN-PB-0001', 1, 'AVAILABLE', NULL),
  (52, 10, 4,  'BATCH-PB-ONHAND', 'SN-PB-0002', 1, 'AVAILABLE', NULL);

-- ─────────────────────────────────────────
-- 6. PUTAWAY TASKS  (for IN_PUTAWAY inventory items 34-35)
-- ─────────────────────────────────────────
INSERT INTO putaway_task (id, inventory_id, suggested_bin_id, status, warehouse_id, priority) VALUES
  (1, 34, NULL, 'PENDING',   1, 1),
  (2, 35, NULL, 'PENDING',   1, 2);

-- ─────────────────────────────────────────
-- 7. TROLLEYS  &  RACK COMPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO trolley (id, trolley_identifier) VALUES
  (1, 'TRL-001'),
  (2, 'TRL-002'),
  (3, 'TRL-003');

INSERT INTO rack_compartment (id, rack_id, compartment_identifier) VALUES
  (1, 1, 'COMP-A1R1-01'),
  (2, 1, 'COMP-A1R1-02'),
  (3, 2, 'COMP-A1R2-01'),
  (4, 2, 'COMP-A1R2-02'),
  (5, 3, 'COMP-A2R1-01'),
  (6, 3, 'COMP-A2R1-02');

-- ─────────────────────────────────────────
-- 8. SALES ORDERS  (4 orders in different stages)
-- ─────────────────────────────────────────
INSERT INTO sales_order (id, so_number, customer_name, order_date, status, created_at) VALUES
  (1, 'SO-2026-001', 'Acme Corporation',    '2026-03-15', 'RESERVED',  '2026-03-15 09:12:00'),
  (2, 'SO-2026-002', 'Global Traders Ltd.', '2026-03-16', 'RESERVED',  '2026-03-16 11:30:00'),
  (3, 'SO-2026-003', 'Tech Solutions Inc.', '2026-03-17', 'PACKED',    '2026-03-17 14:05:00'),
  (4, 'SO-2026-004', 'Regional Stores Co.', '2026-03-18', 'SHIPPED',   '2026-03-18 08:45:00');

-- Sales order lines
INSERT INTO sales_order_line (id, sales_order_id, sku_id, quantity) VALUES
  -- SO-001: 3 mice + 2 keyboards
  (1, 1, 1, 3),
  (2, 1, 2, 2),
  -- SO-002: 2 HDMI cables + 1 laptop stand
  (3, 2, 3, 2),
  (4, 2, 4, 1),
  -- SO-003: 2 SSD (PACKED)
  (5, 3, 8, 2),
  -- SO-004: 2 monitors (SHIPPED)
  (6, 4, 5, 2);

-- ─────────────────────────────────────────
-- 9. PICK TASKS
-- ─────────────────────────────────────────
INSERT INTO pick_task (id, sales_order_line_id, inventory_id, quantity_to_pick, status, bin_barcode, sku_code) VALUES
  -- SO-001 picks (RESERVED inventory 8-10 for mice, 19-20 for keyboards)
  (1, 1, 8,  1, 'PENDING',   'BIN-A1R1-03', 'SKU-WM01'),
  (2, 1, 9,  1, 'PENDING',   'BIN-A1R1-04', 'SKU-WM01'),
  (3, 1, 10, 1, 'PENDING',   'BIN-A1R1-05', 'SKU-WM01'),
  (4, 2, 19, 1, 'PENDING',   'BIN-A2R2-04', 'SKU-KB02'),
  (5, 2, 20, 1, 'PENDING',   'BIN-A2R2-05', 'SKU-KB02'),
  -- SO-002 picks (RESERVED inventory don't exist yet – use PENDING state so operator sees them)
  -- Using inventory 21, 22 for SO-002 HDMI lines (these are AVAILABLE, showing pending picks)
  (6, 3, 21, 1, 'PENDING',   'BIN-B1R1-01', 'SKU-HD03'),
  (7, 3, 22, 1, 'PENDING',   'BIN-B1R1-02', 'SKU-HD03'),
  (8, 4, 31, 1, 'PENDING',   'BIN-B2R1-01', 'SKU-LS04'),
  -- SO-003 picks (PACKED – already completed)
  (9,  5, 47, 1, 'COMPLETED', NULL,           'SKU-SS08'),
  (10, 5, 48, 1, 'COMPLETED', NULL,           'SKU-SS08');

-- ─────────────────────────────────────────
-- 10. SHIPMENT RECORD  (for shipped SO-004)
-- ─────────────────────────────────────────
INSERT INTO shipment_record (id, sales_order_id, awb_number, courier_name) VALUES
  (1, 4, 'AWB-FX-20260318-7721', 'FedEx'),
  (2, 3, 'AWB-DH-20260319-4412', 'DHL');

-- ─────────────────────────────────────────
-- 11. MOVEMENT LOG  (audit trail snapshots)
-- ─────────────────────────────────────────
INSERT INTO movement_log (inventory_id, from_state, to_state, bin_id, action) VALUES
  (1,  'RECEIVED', 'AVAILABLE', 1,  'PUTAWAY_COMPLETED'),
  (2,  'RECEIVED', 'AVAILABLE', 2,  'PUTAWAY_COMPLETED'),
  (3,  'RECEIVED', 'AVAILABLE', 3,  'PUTAWAY_COMPLETED'),
  (11, 'RECEIVED', 'AVAILABLE', 11, 'PUTAWAY_COMPLETED'),
  (12, 'RECEIVED', 'AVAILABLE', 12, 'PUTAWAY_COMPLETED'),
  (8,  'AVAILABLE','RESERVED',  8,  'ORDER_RESERVED'),
  (9,  'AVAILABLE','RESERVED',  9,  'ORDER_RESERVED'),
  (10, 'AVAILABLE','RESERVED', 10,  'ORDER_RESERVED'),
  (47, 'RESERVED', 'PICKED',   NULL,'PICK_EXECUTED'),
  (48, 'PICKED',   'PACKED',   NULL,'PACK_COMPLETED');
