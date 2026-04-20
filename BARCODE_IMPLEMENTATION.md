# Scannable Barcode Implementation

## Overview
Each inventory item now gets a unique, deterministic, scannable barcode when received via GRN.

## Barcode Format
**Pattern:** `WMS` + 4-digit SKU ID + 6-digit GRN ID + 5-digit sequence

**Example:** `WMS000100000100001`
- `WMS` = prefix
- `0001` = SKU ID 1
- `000001` = GRN ID 1
- `00001` = 1st item in this batch

**Total length:** 18 characters (alphanumeric, Code128 compatible)

## Features

### 1. Auto-generation on GRN
- When a PO is received, each inventory item gets a unique barcode
- Format is deterministic: same SKU + GRN + sequence always produces the same barcode
- Stored in `inventory.serial_no` column

### 2. Putaway Integration
- Putaway tasks automatically show the item barcode
- Workers scan the item barcode to confirm putaway
- No manual barcode entry needed

### 3. Label Printing
- **GRN Page:** Each GRN row has a "Print Labels" button
- Clicking it fetches all item barcodes for that GRN
- Opens a print-ready label sheet with Code128 barcodes
- Labels show: SKU code, description, barcode image, barcode text, batch number

### 4. Barcode API
- **Endpoint:** `GET /api/inbound/grn/{id}/item-barcodes`
- Returns: `[{ barcode, skuCode, description, batchNo }, ...]`
- Used by the label printing feature

## Technical Details

### Backend Changes
1. **InboundService.buildItemBarcode()** — new signature:
   ```java
   private String buildItemBarcode(Long skuId, Long grnId, long sequence)
   ```
   Returns: `WMS%04d%06d%05d` format

2. **InboundService.getGrnItemBarcodes()** — new method:
   - Fetches all inventory items for a GRN
   - Returns barcode + SKU info for label printing

3. **InventoryRepository.findByGoodsReceiptLineId()** — new query:
   - Finds all inventory items for a GRN line

### Frontend Changes
1. **GRN Page (`grn/page.jsx`)**:
   - Added "Print Labels" button per GRN row
   - `printItemLabels()` function fetches barcodes and opens print window
   - Label sheet uses Code128 barcode rendering via external API

2. **Putaway Page (`putaway/page.jsx`)**:
   - Already shows `itemBarcode` field (no changes needed)
   - Will automatically display new format once items are received

## Usage Flow

1. **Receive PO** → GRN created → Each item gets a unique barcode
2. **View GRN** → Click "Print Labels" → Print barcode labels for all items
3. **Putaway** → Scan item barcode → Scan destination bin → Complete putaway

## Barcode Scanning
- Format is Code128 compatible
- Can be scanned by any standard barcode scanner
- No special configuration needed
- Barcode readers will read the full 18-character string

## Migration
Existing inventory items with old barcode format will continue to work. New items received after this update will use the new format.

To regenerate barcodes for existing items, re-receive the PO or manually update `inventory.serial_no` using the new format.
