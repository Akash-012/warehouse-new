package com.warehouse.wms.entity;

import java.util.Arrays;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Application roles with their associated permission sets.
 *
 * Permission matrix
 * ─────────────────────────────────────────────────────────
 * Permission            SUPER_ADMIN  ADMIN  MANAGER  WORKER
 * DASHBOARD_VIEW             ✓        ✓       ✓       ✓
 * INBOUND_VIEW               ✓        ✓       ✓       ✓
 * INBOUND_RECEIVE            ✓        ✓       ✓       -
 * INVENTORY_VIEW             ✓        ✓       ✓       ✓
 * INVENTORY_ADJUST           ✓        ✓       ✓       -
 * PUTAWAY_VIEW               ✓        ✓       ✓       ✓
 * PUTAWAY_EXECUTE            ✓        ✓       ✓       ✓
 * PICKING_VIEW               ✓        ✓       ✓       ✓
 * PICKING_EXECUTE            ✓        ✓       ✓       ✓
 * PACKING_VIEW               ✓        ✓       ✓       ✓
 * PACKING_EXECUTE            ✓        ✓       ✓       ✓
 * SHIPPING_VIEW              ✓        ✓       ✓       -
 * SHIPPING_CONFIRM           ✓        ✓       ✓       -
 * ORDERS_VIEW                ✓        ✓       ✓       -
 * ORDERS_CREATE              ✓        ✓       ✓       -
 * TROLLEYS_VIEW              ✓        ✓       ✓       ✓
 * TROLLEYS_CREATE            ✓        ✓       ✓       ✓
 * TROLLEYS_ASSIGN            ✓        ✓       ✓       ✓
 * LABELS_VIEW                ✓        ✓       ✓       ✓
 * LABELS_PRINT               ✓        ✓       ✓       ✓
 * REPORTS_VIEW               ✓        ✓       ✓       -
 * REPORTS_EXPORT             ✓        ✓       ✓       -
 * MASTER_VIEW                ✓        ✓       ✓       -
 * MASTER_MANAGE              ✓        ✓       -       -
 * USERS_VIEW                 ✓        ✓       -       -
 * USERS_MANAGE               ✓        -       -       -
 */
public enum Role {

    SUPER_ADMIN(EnumSet.allOf(Permission.class)),

    ADMIN(EnumSet.of(
            Permission.DASHBOARD_VIEW,
            Permission.INBOUND_VIEW,    Permission.INBOUND_RECEIVE,
            Permission.INVENTORY_VIEW,  Permission.INVENTORY_ADJUST,
            Permission.PUTAWAY_VIEW,    Permission.PUTAWAY_EXECUTE,
            Permission.PICKING_VIEW,    Permission.PICKING_EXECUTE,
            Permission.PACKING_VIEW,    Permission.PACKING_EXECUTE,
            Permission.SHIPPING_VIEW,   Permission.SHIPPING_CONFIRM,
            Permission.ORDERS_VIEW,     Permission.ORDERS_CREATE,
            Permission.TROLLEYS_VIEW,   Permission.TROLLEYS_CREATE, Permission.TROLLEYS_ASSIGN,
            Permission.LABELS_VIEW,     Permission.LABELS_PRINT,
            Permission.REPORTS_VIEW,    Permission.REPORTS_EXPORT,
            Permission.MASTER_VIEW,     Permission.MASTER_MANAGE,
            Permission.USERS_VIEW
    )),

    MANAGER(EnumSet.of(
            Permission.DASHBOARD_VIEW,
            Permission.INBOUND_VIEW,    Permission.INBOUND_RECEIVE,
            Permission.INVENTORY_VIEW,  Permission.INVENTORY_ADJUST,
            Permission.PUTAWAY_VIEW,    Permission.PUTAWAY_EXECUTE,
            Permission.PICKING_VIEW,    Permission.PICKING_EXECUTE,
            Permission.PACKING_VIEW,    Permission.PACKING_EXECUTE,
            Permission.SHIPPING_VIEW,   Permission.SHIPPING_CONFIRM,
            Permission.ORDERS_VIEW,     Permission.ORDERS_CREATE,
            Permission.TROLLEYS_VIEW,   Permission.TROLLEYS_CREATE, Permission.TROLLEYS_ASSIGN,
            Permission.LABELS_VIEW,     Permission.LABELS_PRINT,
            Permission.REPORTS_VIEW,    Permission.REPORTS_EXPORT,
            Permission.MASTER_VIEW
    )),

    WORKER(EnumSet.of(
            Permission.DASHBOARD_VIEW,
            Permission.INBOUND_VIEW,
            Permission.INVENTORY_VIEW,
            Permission.PUTAWAY_VIEW,    Permission.PUTAWAY_EXECUTE,
            Permission.PICKING_VIEW,    Permission.PICKING_EXECUTE,
            Permission.PACKING_VIEW,    Permission.PACKING_EXECUTE,
            Permission.TROLLEYS_VIEW,   Permission.TROLLEYS_CREATE, Permission.TROLLEYS_ASSIGN,
            Permission.LABELS_VIEW,     Permission.LABELS_PRINT
    ));

    private final Set<Permission> permissions;

    Role(Set<Permission> permissions) {
        this.permissions = Collections.unmodifiableSet(permissions);
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }
}
