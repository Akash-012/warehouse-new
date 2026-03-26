CREATE TABLE goods_receipt (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    grn_no VARCHAR(100) NOT NULL UNIQUE,
    purchase_order_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id)
);

CREATE TABLE goods_receipt_line (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    goods_receipt_id BIGINT NOT NULL,
    sku_id BIGINT NOT NULL,
    batch_no VARCHAR(100),
    quantity_received INT NOT NULL,
    FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipt(id),
    FOREIGN KEY (sku_id) REFERENCES sku(id)
);

ALTER TABLE inventory
    ADD COLUMN goods_receipt_line_id BIGINT NULL,
    ADD CONSTRAINT fk_inventory_goods_receipt_line
        FOREIGN KEY (goods_receipt_line_id) REFERENCES goods_receipt_line(id);

ALTER TABLE putaway_task
    ADD COLUMN priority INT NOT NULL DEFAULT 1;

CREATE INDEX idx_grn_no ON goods_receipt(grn_no);
CREATE INDEX idx_grn_line_receipt ON goods_receipt_line(goods_receipt_id);
CREATE INDEX idx_inventory_grn_line_state ON inventory(goods_receipt_line_id, state);
CREATE INDEX idx_putaway_task_status_priority ON putaway_task(status, priority);
