-- Run this against wms_db to remove all demo/seed data
-- Keeps: warehouse structure, roles, users

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE shipment_record;
TRUNCATE TABLE pick_task;
TRUNCATE TABLE putaway_task;
TRUNCATE TABLE inventory;
TRUNCATE TABLE goods_receipt_line;
TRUNCATE TABLE goods_receipt;
TRUNCATE TABLE purchase_order_line;
TRUNCATE TABLE purchase_order;
TRUNCATE TABLE sales_order_line;
TRUNCATE TABLE sales_order;
TRUNCATE TABLE sku_dimension;
TRUNCATE TABLE sku;

SET FOREIGN_KEY_CHECKS = 1;
