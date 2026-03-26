-- Warehouse Structure
CREATE TABLE warehouse (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255)
);

CREATE TABLE zone (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse(id)
);

CREATE TABLE aisle (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    zone_id BIGINT NOT NULL,
    aisle_number VARCHAR(50) NOT NULL,
    FOREIGN KEY (zone_id) REFERENCES zone(id)
);

CREATE TABLE rack (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    aisle_id BIGINT NOT NULL,
    rack_identifier VARCHAR(50) NOT NULL,
    FOREIGN KEY (aisle_id) REFERENCES aisle(id)
);

CREATE TABLE bin (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rack_id BIGINT,
    barcode VARCHAR(255) NOT NULL UNIQUE,
    length_cm DECIMAL(10, 2) NOT NULL,
    width_cm DECIMAL(10, 2) NOT NULL,
    height_cm DECIMAL(10, 2) NOT NULL,
    volume_cm3 DECIMAL(10, 2) GENERATED ALWAYS AS (length_cm * width_cm * height_cm),
    max_weight_g DECIMAL(10, 2) NOT NULL,
    occupied_volume_cm3 DECIMAL(10, 2) DEFAULT 0,
    occupied_weight_g DECIMAL(10, 2) DEFAULT 0,
    status ENUM('AVAILABLE', 'FULL', 'BLOCKED') NOT NULL,
    FOREIGN KEY (rack_id) REFERENCES rack(id)
);
CREATE INDEX idx_bin_barcode ON bin(barcode);

-- SKU and Product Information
CREATE TABLE sku (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sku_code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE sku_dimension (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sku_id BIGINT NOT NULL,
    length_cm DECIMAL(10, 2) NOT NULL,
    width_cm DECIMAL(10, 2) NOT NULL,
    height_cm DECIMAL(10, 2) NOT NULL,
    weight_g DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sku_id) REFERENCES sku(id)
);

-- Inbound Logistics
CREATE TABLE purchase_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(100) NOT NULL UNIQUE,
    supplier VARCHAR(255),
    expected_arrival_date DATE,
    status VARCHAR(50)
);

CREATE TABLE purchase_order_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL,
    sku_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id),
    FOREIGN KEY (sku_id) REFERENCES sku(id)
);

-- Inventory
CREATE TABLE inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sku_id BIGINT NOT NULL,
    bin_id BIGINT,
    batch_no VARCHAR(100),
    serial_no VARCHAR(100) UNIQUE,
    quantity INT NOT NULL,
    state ENUM('RECEIVED', 'IN_PUTAWAY', 'AVAILABLE', 'RESERVED', 'PICKED', 'PACKED', 'SHIPPED') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sku_id) REFERENCES sku(id),
    FOREIGN KEY (bin_id) REFERENCES bin(id)
);
CREATE INDEX idx_inventory_sku_state ON inventory(sku_id, state);

-- Warehouse Tasks
CREATE TABLE putaway_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inventory_id BIGINT NOT NULL,
    suggested_bin_id BIGINT,
    status VARCHAR(50),
    warehouse_id BIGINT,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    FOREIGN KEY (suggested_bin_id) REFERENCES bin(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouse(id)
);

-- Outbound Logistics
CREATE TABLE sales_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    so_number VARCHAR(100) NOT NULL UNIQUE,
    customer_name VARCHAR(255),
    order_date DATE,
    status VARCHAR(50)
);

CREATE TABLE sales_order_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id BIGINT NOT NULL,
    sku_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (sales_order_id) REFERENCES sales_order(id),
    FOREIGN KEY (sku_id) REFERENCES sku(id)
);

CREATE TABLE pick_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sales_order_line_id BIGINT NOT NULL,
    inventory_id BIGINT NOT NULL,
    quantity_to_pick INT NOT NULL,
    status VARCHAR(50),
    FOREIGN KEY (sales_order_line_id) REFERENCES sales_order_line(id),
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

-- Additional Tables
CREATE TABLE trolley (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trolley_identifier VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE rack_compartment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rack_id BIGINT NOT NULL,
    compartment_identifier VARCHAR(50) NOT NULL,
    FOREIGN KEY (rack_id) REFERENCES rack(id)
);

CREATE TABLE movement_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inventory_id BIGINT NOT NULL,
    from_state ENUM('RECEIVED', 'IN_PUTAWAY', 'AVAILABLE', 'RESERVED', 'PICKED', 'PACKED', 'SHIPPED'),
    to_state ENUM('RECEIVED', 'IN_PUTAWAY', 'AVAILABLE', 'RESERVED', 'PICKED', 'PACKED', 'SHIPPED') NOT NULL,
    bin_id BIGINT,
    user_id BIGINT,
    action VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    FOREIGN KEY (bin_id) REFERENCES bin(id)
    -- user_id would reference a users table, which is omitted for brevity but required in a real system
);
