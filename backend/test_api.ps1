$base = "http://localhost:8080/api"
$ErrorActionPreference = "SilentlyContinue"

function Invoke-API {
    param($method, $path, $body = $null, $token = $null)
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        if ($body) {
            return Invoke-RestMethod -Uri "$base$path" -Method $method -Headers $headers -Body ($body | ConvertTo-Json -Depth 10) -TimeoutSec 10
        } else {
            return Invoke-RestMethod -Uri "$base$path" -Method $method -Headers $headers -TimeoutSec 10
        }
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
            $reader = [System.IO.StreamReader]::new($stream)
            return "ERROR $($_.Exception.Response.StatusCode): $($reader.ReadToEnd())"
        }
        return "ERROR: $($_.Exception.Message)"
    }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " WMS API FULL WORKFLOW TEST" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# STEP 1 - Login
Write-Host "`n[STEP 1] POST /auth/login" -ForegroundColor Yellow
$loginResult = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 10
$token = $loginResult.token
if ($token) { Write-Host "  OK Logged in | token $($token.Length) chars" -ForegroundColor Green }
else { Write-Host "  FAIL - no token"; exit 1 }

# STEP 2 - Dashboard KPIs
Write-Host "`n[STEP 2] GET /dashboard/kpis" -ForegroundColor Yellow
$kpis = Invoke-API GET "/dashboard/kpis" -token $token
if ($kpis -is [string]) { Write-Host "  $kpis" } else {
    Write-Host "  OK totalSkus=$($kpis.totalSkus) openOrders=$($kpis.openOrders) pendingPicks=$($kpis.pendingPicks) available=$($kpis.inventoryByState.AVAILABLE)" -ForegroundColor Green
}

# STEP 3 - List Purchase Orders
Write-Host "`n[STEP 3] GET /purchase-orders" -ForegroundColor Yellow
$pos = Invoke-API GET "/purchase-orders" -token $token
if ($pos -is [string]) { Write-Host "  $pos" } else {
    Write-Host "  OK $($pos.Count) purchase orders:" -ForegroundColor Green
    $pos | ForEach-Object { Write-Host "    [$($_.id)] $($_.poNumber) | $($_.supplier) | status=$($_.status)" }
}

# STEP 4 - Receive PO (PO-2026-003, id=3, PENDING) - has skuIds 6,7,8
Write-Host "`n[STEP 4] POST /inbound/receive (PO id=3, skuId=6 qty=2, skuId=7 qty=2)" -ForegroundColor Yellow
$receiveBody = @{
    poId  = 3
    lines = @(
        @{ skuId = 6; quantity = 2; batchNo = "BATCH-TEST-01" }
        @{ skuId = 7; quantity = 2; batchNo = "BATCH-TEST-01" }
    )
}
$grn = Invoke-API POST "/inbound/receive" $receiveBody $token
if ($grn -is [string]) { Write-Host "  $grn" }
else { Write-Host "  OK GRN=$($grn.grnNo) totalItems=$($grn.totalItemsReceived)" -ForegroundColor Green }

# STEP 4b - Get GRN 1
Write-Host "`n[STEP 4b] GET /inbound/grn/1" -ForegroundColor Yellow
$grn1 = Invoke-API GET "/inbound/grn/1" -token $token
if ($grn1 -is [string]) { Write-Host "  $grn1" }
else { Write-Host "  OK grnNo=$($grn1.grnNo) lines=$($grn1.lines.Count)" -ForegroundColor Green }

# STEP 5 - Inventory List
Write-Host "`n[STEP 5] GET /inventory?page=0&size=5" -ForegroundColor Yellow
$inv = Invoke-API GET "/inventory?page=0&size=5" -token $token
if ($inv -is [string]) { Write-Host "  $inv" } else {
    Write-Host "  OK Total inventory items: $($inv.totalElements)" -ForegroundColor Green
    $inv.content | ForEach-Object { Write-Host "    [$($_.id)] $($_.skuCode) | bin=$($_.binBarcode) | state=$($_.state) | qty=$($_.quantity)" }
}

# STEP 6 - List Orders
Write-Host "`n[STEP 6] GET /orders" -ForegroundColor Yellow
$orders = Invoke-API GET "/orders" -token $token
if ($orders -is [string]) { Write-Host "  $orders" } else {
    Write-Host "  OK $($orders.Count) sales orders:" -ForegroundColor Green
    $orders | ForEach-Object { Write-Host "    [$($_.id)] customer=$($_.customerName) | status=$($_.status)" }
}

# STEP 7 - Create New Sales Order
Write-Host "`n[STEP 7] POST /orders (create new sales order)" -ForegroundColor Yellow
$orderBody = @{
    customerName = "Test Customer API"
    lines        = @(
        @{ skuId = 1; quantity = 1 }
        @{ skuId = 2; quantity = 1 }
    )
}
$newOrder = Invoke-API POST "/orders" $orderBody $token
if ($newOrder -is [string]) { Write-Host "  $newOrder" }
else { Write-Host "  OK orderId=$($newOrder.orderId) soNumber=$($newOrder.soNumber) status=$($newOrder.status) pickTasks=$($newOrder.pickTaskIds.Count)" -ForegroundColor Green }

# STEP 8 - Pick Tasks for Order 1
Write-Host "`n[STEP 8] GET /orders/1/pick-tasks" -ForegroundColor Yellow
$picks = Invoke-API GET "/orders/1/pick-tasks" -token $token
if ($picks -is [string]) { Write-Host "  $picks" } else {
    Write-Host "  OK $($picks.Count) pick tasks for order 1:" -ForegroundColor Green
    $picks | Select-Object -First 5 | ForEach-Object { Write-Host "    [$($_.id)] sku=$($_.skuCode) | bin=$($_.binBarcode) | qty=$($_.quantity) | status=$($_.state)" }
}

# STEP 9 - Pending Pick Tasks
Write-Host "`n[STEP 9] GET /picking/tasks/pending (first 3)" -ForegroundColor Yellow
$pending = Invoke-API GET "/picking/tasks/pending" -token $token
if ($pending -is [string]) { Write-Host "  $pending" } else {
    Write-Host "  OK $($pending.Count) pending tasks" -ForegroundColor Green
    $pending | Select-Object -First 3 | ForEach-Object { Write-Host "    [$($_.id)] sku=$($_.skuCode) bin=$($_.binBarcode) qty=$($_.quantityToPick)" }
}

# STEP 10 - Master Data
Write-Host "`n[STEP 10a] GET /master/warehouses" -ForegroundColor Yellow
$wh = Invoke-API GET "/master/warehouses" -token $token
if ($wh -is [string]) { Write-Host "  $wh" } else { Write-Host "  OK $($wh.Count) warehouses" -ForegroundColor Green }

Write-Host "`n[STEP 10b] GET /master/bins?page=0&size=5" -ForegroundColor Yellow
$bins = Invoke-API GET "/master/bins?page=0&size=5" -token $token
if ($bins -is [string]) { Write-Host "  $bins" } else { Write-Host "  OK Total bins: $($bins.totalElements)" -ForegroundColor Green }

# STEP 11 - Create Trolley
Write-Host "`n[STEP 11] POST /trolleys (create new trolley)" -ForegroundColor Yellow
$ts = Get-Date -Format "yyyyMMddHHmmss"
$trolleyBody = @{
    trolleyBarcode       = "TROLLEY-TEST-$ts"
    compartmentBarcodes  = @("COMP-A1R1-01", "COMP-A1R1-02", "COMP-A1R2-01")
}
$newTrolley = Invoke-API POST "/trolleys" $trolleyBody $token
if ($newTrolley -is [string]) { Write-Host "  $newTrolley" }
else { Write-Host "  OK trolleyId=$($newTrolley.id) identifier=$($newTrolley.trolleyIdentifier)" -ForegroundColor Green }

# STEP 12 - Get Trolley Contents
Write-Host "`n[STEP 12] GET /trolleys/{barcode}/compartments" -ForegroundColor Yellow
$trolleyBarcode = "TROLLEY-TEST-$ts"
$comp = Invoke-API GET "/trolleys/$trolleyBarcode/compartments" -token $token
if ($comp -is [string]) { Write-Host "  $comp" } else { Write-Host "  OK $($comp.Count) compartments" -ForegroundColor Green }

# STEP 13 - Reports
Write-Host "`n[STEP 13] GET /reports/kpis" -ForegroundColor Yellow
$rkpis = Invoke-API GET "/reports/kpis" -token $token
if ($rkpis -is [string]) { Write-Host "  $rkpis" }
else { Write-Host "  OK totalSkus=$($rkpis.totalSkus) openOrders=$($rkpis.openOrders) pendingPicks=$($rkpis.pendingPicks)" -ForegroundColor Green }

Write-Host "`n[STEP 13b] GET /reports/inventory-by-state" -ForegroundColor Yellow
$rInv = Invoke-API GET "/reports/inventory-by-state" -token $token
if ($rInv -is [string]) { Write-Host "  $rInv" } else {
    $rInv.PSObject.Properties | ForEach-Object { Write-Host "    $($_.Name): $($_.Value)" }
}

# STEP 14 - PUT Update Order Status
Write-Host "`n[STEP 14] PUT /master/warehouses/1 (update warehouse name)" -ForegroundColor Yellow
$wUpdate = Invoke-API PUT "/master/warehouses/1" @{ name = "Main Warehouse (Updated)"; location = "Zone A" } $token
if ($wUpdate -is [string]) { Write-Host "  $wUpdate" }
else { Write-Host "  OK id=$($wUpdate.id) name=$($wUpdate.name)" -ForegroundColor Green }

# STEP 15 - Revert warehouse name
Write-Host "`n[STEP 15] PUT /master/warehouses/1 (revert name)" -ForegroundColor Yellow
$wRevert = Invoke-API PUT "/master/warehouses/1" @{ name = "Main Warehouse"; location = "Zone A" } $token
if ($wRevert -is [string]) { Write-Host "  $wRevert" }
else { Write-Host "  OK reverted to: $($wRevert.name)" -ForegroundColor Green }

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host " ALL STEPS COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
