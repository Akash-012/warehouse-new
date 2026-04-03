# Warehouse Management System (WMS Pro)
## Client Flow Diagram Document

Prepared on: 03 April 2026

---

## 1) Full Solution Architecture Flow

```mermaid
flowchart LR
    U[Warehouse Users<br/>Admin, Supervisor, Operator] --> FE[Frontend Portal<br/>Next.js]

    FE -->|JWT Login| AUTH[Auth API<br/>Spring Security + JWT]
    FE -->|Business Actions| API[WMS Service Layer<br/>Spring Boot REST APIs]

    AUTH --> API
    API --> RBAC[Role and Permission Engine]
    API --> DB[(MySQL Database)]

    API --> AI[AI Assistant API<br/>Optional]

    DB --> R1[Master Data<br/>Warehouse, Zone, Aisle, Rack, Bin]
    DB --> R2[Inbound and Putaway Data]
    DB --> R3[Inventory Stock Ledger]
    DB --> R4[Orders, Picking, Packing, Shipping]
    DB --> R5[Users, Roles, Access Matrix]

    API --> REP[Dashboard and Reports]
    REP --> FE
```

---

## 2) End-to-End Warehouse Operations Flow

```mermaid
flowchart TD
    A[Supplier Shipment Arrives] --> B[Inbound Receive]
    B --> C[GRN Created]
    C --> D[Putaway Tasks Generated]
    D --> E[Putaway Execution to Bin]
    E --> F[Inventory Updated and Available]

    F --> G[Customer Order Created]
    G --> H[Pick Tasks Created]
    H --> I[Trolley Assignment]
    I --> J[Picking Start and Barcode Scan]
    J --> K[Picked Items Confirmed]
    K --> L[Packing Start]
    L --> M[Packing Scan and Verification]
    M --> N[Shipping Confirmation]
    N --> O[Order Closed and Inventory Reduced]

    O --> P[Dashboard KPIs Updated]
    O --> Q[Operational Reports Generated]
```

---

## 3) Admin and Control Flow

```mermaid
flowchart TB
    A1[Admin Login] --> A2[Configure Master Data]
    A2 --> A3[Warehouses]
    A2 --> A4[Zones]
    A2 --> A5[Aisles]
    A2 --> A6[Racks]
    A2 --> A7[Bins]

    A1 --> B1[User and Role Management]
    B1 --> B2[Create Users]
    B1 --> B3[Create Roles]
    B1 --> B4[Assign Permissions]

    B4 --> C1[Access-Controlled Menus]
    C1 --> C2[Operations Pages]
    C1 --> C3[Fulfillment Pages]
    C1 --> C4[Reports and Settings]

    C2 --> D1[Secure API Calls]
    C3 --> D1
    C4 --> D1
    D1 --> D2[Audit-Friendly Centralized Data]
```

---

## 4) Short Client Explanation (For Word Document)

WMS Pro follows a secure, role-based flow from inbound receiving to outbound shipping.

1. Goods are received through inbound, GRN is created, and putaway tasks store products in bins.
2. Inventory becomes available for order processing and live stock visibility.
3. Orders move through picking, trolley assignment, packing, and shipping confirmation.
4. Every operational transaction updates dashboard KPIs and reporting.
5. Admin functions control master data, user roles, and permission-based access.

This design gives traceability, stock accuracy, controlled user access, and faster order fulfillment.

---

## 5) Recommended Export Method for Client Submission

1. Open this file in VS Code preview or any Markdown viewer.
2. Copy each rendered diagram (or copy Mermaid code into mermaid.live and export PNG/SVG).
3. Paste the exported diagram images into your Word document.
4. Add the short explanation section below each diagram.

Suggested Word headings:
- Solution Architecture
- Warehouse Operations Flow
- Admin and Access Control Flow
- Business Benefits
