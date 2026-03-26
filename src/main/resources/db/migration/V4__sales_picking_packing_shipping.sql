ALTER TABLE sales_order
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE rack_compartment
    ADD COLUMN sales_order_id BIGINT NULL,
    ADD COLUMN trolley_id BIGINT NULL,
    ADD CONSTRAINT fk_rack_compartment_sales_order FOREIGN KEY (sales_order_id) REFERENCES sales_order(id),
    ADD CONSTRAINT fk_rack_compartment_trolley FOREIGN KEY (trolley_id) REFERENCES trolley(id);

ALTER TABLE pick_task
    ADD COLUMN bin_barcode VARCHAR(255) NULL,
    ADD COLUMN sku_code VARCHAR(100) NULL,
    ADD COLUMN trolley_id BIGINT NULL,
    ADD COLUMN rack_compartment_id BIGINT NULL,
    ADD CONSTRAINT fk_pick_task_trolley FOREIGN KEY (trolley_id) REFERENCES trolley(id),
    ADD CONSTRAINT fk_pick_task_rack_compartment FOREIGN KEY (rack_compartment_id) REFERENCES rack_compartment(id);

CREATE TABLE shipment_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id BIGINT NOT NULL,
    awb_number VARCHAR(255) NOT NULL,
    courier_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_order(id)
);

CREATE INDEX idx_pick_task_status ON pick_task(status);
CREATE INDEX idx_pick_task_order_line ON pick_task(sales_order_line_id);
CREATE INDEX idx_rack_compartment_sales_order ON rack_compartment(sales_order_id);
CREATE INDEX idx_shipment_record_so ON shipment_record(sales_order_id);
