package com.warehouse.wms.entity;

/**
 * Granular permission constants used in @PreAuthorize expressions.
 * Each Role declares the subset of permissions it grants.
 */
public enum Permission {

    // ── Dashboard ──────────────────────────────────────────────────────────────
    DASHBOARD_VIEW,

    // ── Inbound ────────────────────────────────────────────────────────────────
    INBOUND_VIEW,
    INBOUND_RECEIVE,

    // ── Inventory ──────────────────────────────────────────────────────────────
    INVENTORY_VIEW,
    INVENTORY_ADJUST,

    // ── Putaway ────────────────────────────────────────────────────────────────
    PUTAWAY_VIEW,
    PUTAWAY_EXECUTE,

    // ── Picking ────────────────────────────────────────────────────────────────
    PICKING_VIEW,
    PICKING_EXECUTE,

    // ── Packing ────────────────────────────────────────────────────────────────
    PACKING_VIEW,
    PACKING_EXECUTE,

    // ── Shipping ───────────────────────────────────────────────────────────────
    SHIPPING_VIEW,
    SHIPPING_CONFIRM,

    // ── Orders ─────────────────────────────────────────────────────────────────
    ORDERS_VIEW,
    ORDERS_CREATE,

    // ── Trolleys ───────────────────────────────────────────────────────────────
    TROLLEYS_VIEW,
    TROLLEYS_CREATE,
    TROLLEYS_ASSIGN,

    // ── Labels ─────────────────────────────────────────────────────────────────
    LABELS_VIEW,
    LABELS_PRINT,

    // ── Reports ────────────────────────────────────────────────────────────────
    REPORTS_VIEW,
    REPORTS_EXPORT,

    // ── Master Data ────────────────────────────────────────────────────────────
    MASTER_VIEW,
    MASTER_MANAGE,

    // ── User Management (SUPER_ADMIN + ADMIN only) ────────────────────────────
    USERS_VIEW,
    USERS_MANAGE,
}
