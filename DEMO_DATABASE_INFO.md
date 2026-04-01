# Demo Data and API Smoke Test

## Demo Credentials

- superadmin / superadmin123
- admin / admin123
- manager / manager123
- worker / worker123

## Seeded Baseline Data

On backend startup, `DataInitializer` seeds baseline demo data when tables are empty:

- Warehouse hierarchy:
	- 1 warehouse
	- 2 zones
	- 4 aisles
	- 8 racks
	- 40 bins
- 10 SKUs with dimensions
- Purchase orders and sales orders with realistic statuses
- Inventory and shipment records

## One-Command Demo Seed + API Validation

Run this from `backend`:

```powershell
powershell -ExecutionPolicy Bypass -File .\test_api.ps1
```

What it does:

1. Logs in using admin credentials.
2. Verifies core APIs (dashboard, reports, inventory, orders, picking).
3. Creates additional demo hierarchy records:
	 - Warehouse -> Zone -> Aisle -> Rack -> Bin
4. Creates a new demo sales order and validates pick-task generation.
5. Prints pass/fail summary and returns non-zero exit code if any required API fails.

## UI Demo Flow (Recommended)

Use this sequence in the app:

1. Master -> Warehouse Master
2. Master -> Zone Master
3. Master -> Aisle Master
4. Master -> Rack Master
5. Master -> Bin Master
6. Orders -> Create Order -> view Pick Tasks
7. Reports -> KPIs and exports

This validates both backend APIs and frontend pages in a realistic operator flow.
