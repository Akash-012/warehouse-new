CREATE TABLE IF NOT EXISTS wms_role (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS wms_role_permission (
    role_id BIGINT NOT NULL,
    permission VARCHAR(100) NOT NULL,
    PRIMARY KEY (role_id, permission),
    CONSTRAINT fk_wms_role_permission_role FOREIGN KEY (role_id) REFERENCES wms_role(id) ON DELETE CASCADE
);

INSERT INTO wms_role (name)
SELECT 'SUPER_ADMIN' WHERE NOT EXISTS (SELECT 1 FROM wms_role WHERE name = 'SUPER_ADMIN');
INSERT INTO wms_role (name)
SELECT 'ADMIN' WHERE NOT EXISTS (SELECT 1 FROM wms_role WHERE name = 'ADMIN');
INSERT INTO wms_role (name)
SELECT 'MANAGER' WHERE NOT EXISTS (SELECT 1 FROM wms_role WHERE name = 'MANAGER');
INSERT INTO wms_role (name)
SELECT 'WORKER' WHERE NOT EXISTS (SELECT 1 FROM wms_role WHERE name = 'WORKER');

INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'DASHBOARD_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'INBOUND_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'INVENTORY_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'PUTAWAY_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'PUTAWAY_EXECUTE' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'PICKING_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'PICKING_EXECUTE' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'PACKING_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'PACKING_EXECUTE' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'TROLLEYS_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'TROLLEYS_CREATE' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'TROLLEYS_ASSIGN' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'LABELS_VIEW' FROM wms_role r;
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'LABELS_PRINT' FROM wms_role r;

INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'INBOUND_RECEIVE' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'INVENTORY_ADJUST' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'SHIPPING_VIEW' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'SHIPPING_CONFIRM' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'ORDERS_VIEW' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'ORDERS_CREATE' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'REPORTS_VIEW' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'REPORTS_EXPORT' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'MASTER_VIEW' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN','MANAGER');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'MASTER_MANAGE' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'USERS_VIEW' FROM wms_role r WHERE r.name IN ('SUPER_ADMIN','ADMIN');
INSERT IGNORE INTO wms_role_permission(role_id, permission)
SELECT r.id, 'USERS_MANAGE' FROM wms_role r WHERE r.name = 'SUPER_ADMIN';

ALTER TABLE _user ADD COLUMN role_id BIGINT NULL;

UPDATE _user u
JOIN wms_role r ON UPPER(REPLACE(u.role, 'ROLE_', '')) = r.name
SET u.role_id = r.id
WHERE u.role_id IS NULL;

UPDATE _user u
JOIN wms_role r ON r.name = 'WORKER'
SET u.role_id = r.id
WHERE u.role_id IS NULL;

ALTER TABLE _user MODIFY role_id BIGINT NOT NULL;
ALTER TABLE _user ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES wms_role(id);
ALTER TABLE _user DROP COLUMN role;
