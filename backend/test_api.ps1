param(
    [string]$BaseUrl = "http://localhost:8080/api",
    [string]$Username = "admin",
    [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n[STEP] $Message" -ForegroundColor Yellow
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Body = $null,
        [string]$Token = $null
    )

    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }

    try {
        if ($null -ne $Body) {
            return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10) -TimeoutSec 20
        }
        return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method $Method -Headers $headers -TimeoutSec 20
    }
    catch {
        $status = "UNKNOWN"
        $msg = $_.Exception.Message
        if ($_.Exception.Response) {
            $status = [string]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $bodyText = $reader.ReadToEnd()
                if ($bodyText) { $msg = $bodyText }
            } catch { }
        }
        throw "API $Method $Path failed [$status] $msg"
    }
}

function Test-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][ScriptBlock]$Action,
        [bool]$Optional = $false
    )

    try {
        $result = & $Action
        Write-Host "  OK $Name" -ForegroundColor Green
        return @{ ok = $true; optional = $Optional; result = $result }
    }
    catch {
        if ($Optional) {
            Write-Host "  WARN $Name -> $($_.Exception.Message)" -ForegroundColor DarkYellow
            return @{ ok = $false; optional = $true; result = $null }
        }
        Write-Host "  FAIL $Name -> $($_.Exception.Message)" -ForegroundColor Red
        return @{ ok = $false; optional = $false; result = $null }
    }
}

function Ensure-ByName {
    param(
        [Parameter(Mandatory = $true)]$List,
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][ScriptBlock]$CreateAction
    )

    $existing = $List | Where-Object { [string]($_.$Key) -eq $Value } | Select-Object -First 1
    if ($existing) { return $existing }
    return & $CreateAction
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " WMS DEMO SEED + API SMOKE TEST" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor DarkCyan

$results = @()
$ts = Get-Date -Format "yyyyMMddHHmmss"
$demoSuffix = $ts.Substring($ts.Length - 6)

Write-Step "Authenticate"
$login = Test-Api -Name "POST /auth/login" -Action {
    Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" -Body (@{ username = $Username; password = $Password } | ConvertTo-Json)
}
$results += $login
if (-not $login.ok -or -not $login.result.token) {
    Write-Host "`nCannot continue without auth token." -ForegroundColor Red
    exit 1
}
$token = $login.result.token

Write-Step "Read baseline endpoints"
$results += Test-Api -Name "GET /dashboard/kpis" -Action { Invoke-Api GET "/dashboard/kpis" $null $token }
$results += Test-Api -Name "GET /reports/kpis" -Action { Invoke-Api GET "/reports/kpis" $null $token }
$results += Test-Api -Name "GET /reports/inventory-by-state" -Action { Invoke-Api GET "/reports/inventory-by-state" $null $token }
$results += Test-Api -Name "GET /inventory?page=0&size=10" -Action { Invoke-Api GET "/inventory?page=0&size=10" $null $token }
$results += Test-Api -Name "GET /purchase-orders" -Action { Invoke-Api GET "/purchase-orders" $null $token }

Write-Step "Ensure demo master hierarchy exists"
$warehouses = Invoke-Api GET "/master/warehouses" $null $token
$warehouseName = "Demo Warehouse $demoSuffix"
$warehouse = Ensure-ByName -List $warehouses -Key "name" -Value $warehouseName -CreateAction {
    Invoke-Api POST "/master/warehouses" @{ name = $warehouseName; location = "Demo City" } $token
}
Write-Host "  Warehouse: $($warehouse.name) (id=$($warehouse.id))" -ForegroundColor Green

$zones = Invoke-Api GET "/master/zones" $null $token
$zoneName = "Demo Zone $demoSuffix"
$zone = Ensure-ByName -List $zones -Key "name" -Value $zoneName -CreateAction {
    Invoke-Api POST "/master/zones" @{ name = $zoneName; warehouseId = $warehouse.id } $token
}
Write-Host "  Zone: $($zone.name) (id=$($zone.id))" -ForegroundColor Green

$aisles = Invoke-Api GET "/master/aisles" $null $token
$aisleCode = "D-$demoSuffix"
$aisle = Ensure-ByName -List $aisles -Key "aisleNumber" -Value $aisleCode -CreateAction {
    Invoke-Api POST "/master/aisles" @{ aisleNumber = $aisleCode; zoneId = $zone.id } $token
}
Write-Host "  Aisle: $($aisle.aisleNumber) (id=$($aisle.id))" -ForegroundColor Green

$racks = Invoke-Api GET "/master/racks" $null $token
$rackCode = "R-$demoSuffix"
$rack = Ensure-ByName -List $racks -Key "rackIdentifier" -Value $rackCode -CreateAction {
    Invoke-Api POST "/master/racks" @{ rackIdentifier = $rackCode; aisleId = $aisle.id } $token
}
Write-Host "  Rack: $($rack.rackIdentifier) (id=$($rack.id))" -ForegroundColor Green

$bins = Invoke-Api GET "/master/bins" $null $token
$binCode = "BIN-$demoSuffix-01"
$bin = ($bins | Where-Object { $_.barcode -eq $binCode } | Select-Object -First 1)
if (-not $bin) {
    $bin = Invoke-Api POST "/master/bins" @{
        rackId = $rack.id
        barcode = $binCode
        lengthCm = 60
        widthCm = 40
        heightCm = 30
        maxWeightG = 25000
        status = "AVAILABLE"
    } $token
}
Write-Host "  Bin: $($bin.barcode) (id=$($bin.id))" -ForegroundColor Green

$results += @{ ok = $true; optional = $false; result = "master-seeded" }

Write-Step "Create and validate sales order flow"
$newOrder = $null
$orderCreate = Test-Api -Name "POST /orders" -Action {
    Invoke-Api POST "/orders" @{
        customerName = "Demo Customer $demoSuffix"
        lines = @(
            @{ skuCode = "SKU-001"; quantity = 1 },
            @{ skuCode = "SKU-002"; quantity = 2 }
        )
    } $token
}
$results += $orderCreate
if ($orderCreate.ok) {
    $newOrder = $orderCreate.result
    $newOrderId = $newOrder.orderId
    if (-not $newOrderId) { $newOrderId = $newOrder.id }

    if ($newOrderId) {
        $results += Test-Api -Name "GET /orders/$newOrderId" -Action { Invoke-Api GET "/orders/$newOrderId" $null $token }
        $results += Test-Api -Name "GET /orders/$newOrderId/pick-tasks" -Action { Invoke-Api GET "/orders/$newOrderId/pick-tasks" $null $token }
    }
}

$results += Test-Api -Name "GET /orders" -Action { Invoke-Api GET "/orders" $null $token }
$results += Test-Api -Name "GET /picking/tasks/pending" -Action { Invoke-Api GET "/picking/tasks/pending" $null $token }

Write-Step "Optional operational endpoints"
$results += Test-Api -Name "POST /inbound/receive" -Optional $true -Action {
    $pos = Invoke-Api GET "/purchase-orders" $null $token
    if (-not $pos -or $pos.Count -eq 0) { throw "No purchase orders available" }
    $po = $pos | Where-Object { [string]$_.poNumber -like "*001*" } | Select-Object -First 1
    if (-not $po) { $po = $pos | Select-Object -First 1 }

    $skuCode = "SKU-001"
    if ([string]$po.poNumber -like "*002*") { $skuCode = "SKU-006" }

    Invoke-Api POST "/inbound/receive" @{
        poId = $po.id
        lines = @(
            @{ skuCode = $skuCode; quantity = 1; batchNo = "BATCH-$demoSuffix" }
        )
    } $token
}

$results += Test-Api -Name "POST /trolleys" -Optional $true -Action {
    Invoke-Api POST "/trolleys" @{
        trolleyBarcode = "TROLLEY-DEMO-$demoSuffix"
        compartmentBarcodes = @("COMP-A1R1-01", "COMP-A1R1-02", "COMP-A1R2-01")
    } $token
}

Write-Step "Summary"
$requiredFailed = ($results | Where-Object { -not $_.ok -and -not $_.optional }).Count
$optionalFailed = ($results | Where-Object { -not $_.ok -and $_.optional }).Count
$passed = ($results | Where-Object { $_.ok }).Count

Write-Host "  Passed:   $passed" -ForegroundColor Green
Write-Host "  Optional warnings: $optionalFailed" -ForegroundColor DarkYellow
Write-Host "  Required failures: $requiredFailed" -ForegroundColor Red

if ($requiredFailed -gt 0) {
    Write-Host "`nSmoke test FAILED. Fix required endpoint issues before demo." -ForegroundColor Red
    exit 2
}

Write-Host "`nSmoke test PASSED. Demo data is ready and core APIs are healthy." -ForegroundColor Cyan
exit 0
