'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, X, Sliders, BarChart3, ChevronDown, ChevronUp, Bell, BellOff, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import api from '@/lib/api';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportWmsWorkbook } from '@/lib/exportExcel';

const INVENTORY_STATES = ['AVAILABLE', 'RECEIVED', 'IN_PUTAWAY', 'RESERVED', 'PICKED', 'PACKED', 'SHIPPED'];

const SORT_FIELDS = {
  skuCode: (a, b) => String(a.skuCode ?? a.sku ?? '').localeCompare(String(b.skuCode ?? b.sku ?? '')),
  barcode: (a, b) => String(a.barcode ?? '').localeCompare(String(b.barcode ?? '')),
  binBarcode: (a, b) => String(a.binBarcode ?? a.bin ?? '').localeCompare(String(b.binBarcode ?? b.bin ?? '')),
  state: (a, b) => String(a.state ?? '').localeCompare(String(b.state ?? '')),
  quantity: (a, b) => (a.quantity ?? 0) - (b.quantity ?? 0),
  updatedAt: (a, b) => new Date(a.updatedAt ?? 0) - new Date(b.updatedAt ?? 0),
};

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground/50" />;
  return sortDir === 'asc'
    ? <ArrowUp className="ml-1 size-3.5 text-primary" />
    : <ArrowDown className="ml-1 size-3.5 text-primary" />;
}

function SortableHead({ field, label, sortField, sortDir, onSort }) {
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </TableHead>
  );
}

async function exportSummaryToExcel(summary) {
  await exportWmsWorkbook({
    fileName: `stock_summary_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Available Stock',
    title: 'WMS Stock Summary',
    columns: [
      { header: 'SKU Code',       key: 'skuCode',       width: 16 },
      { header: 'Product Name',   key: 'skuName',       width: 32 },
      { header: 'Available Qty',  key: 'availableQty',  width: 16, align: 'right' },
      { header: 'Unavailable Qty',key: 'unavailableQty',width: 18, align: 'right' },
      { header: 'Total Qty',      key: 'totalQty',      width: 14, align: 'right' },
      { header: 'Status',         key: 'status',        width: 14, align: 'center' },
    ],
    rows: summary.map((s) => ({
      skuCode:       s.skuCode ?? '',
      skuName:       s.skuName ?? '',
      availableQty:  Number(s.availableQty ?? 0),
      unavailableQty:Number(s.unavailableQty ?? 0),
      totalQty:      Number(s.totalQty ?? 0),
      status:        s.status ?? '',
    })),
  });
  toast.success('Stock summary exported to Excel');
}

async function exportToExcel(items) {
  await exportWmsWorkbook({
    fileName: `inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Inventory',
    title: 'WMS Inventory Export',
    columns: [
      { header: 'SKU', key: 'skuCode', width: 16 },
      { header: 'Barcode', key: 'barcode', width: 24 },
      { header: 'Bin', key: 'binBarcode', width: 16 },
      { header: 'State', key: 'state', width: 14, align: 'center' },
      { header: 'Batch', key: 'batchNo', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 12, align: 'right' },
      { header: 'Updated At', key: 'updatedAt', width: 20, align: 'center' },
    ],
    rows: items.map((item) => ({
      skuCode: item.skuCode ?? item.sku ?? '',
      barcode: item.barcode ?? '',
      binBarcode: item.binBarcode ?? item.bin ?? '',
      state: item.state ?? '',
      batchNo: item.batchNo ?? item.batch ?? '',
      quantity: item.quantity ?? '',
      updatedAt: item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm') : '',
    })),
  });
  toast.success('Inventory exported to Excel');
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [warehouse, setWarehouse] = useState('ALL');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('CYCLE_COUNT');
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [summarySearch, setSummarySearch] = useState('');
  const [alertItem, setAlertItem] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState('');
  const [summaryCategory, setSummaryCategory] = useState('ALL');

  const { data: stockSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['stockSummary'],
    queryFn: () => api.get('/inventory/stock-summary').then((r) => r.data ?? []),
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: false,
  });

  const categories = useMemo(() => {
    const cats = new Set((stockSummary ?? []).map((s) => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [stockSummary]);

  const filteredSummary = useMemo(() => {
    let list = stockSummary ?? [];
    if (summaryCategory !== 'ALL') list = list.filter((s) => s.category === summaryCategory);
    if (!summarySearch.trim()) return list;
    const q = summarySearch.toLowerCase();
    return list.filter((s) =>
      String(s.skuCode ?? '').toLowerCase().includes(q) ||
      String(s.skuName ?? '').toLowerCase().includes(q)
    );
  }, [stockSummary, summarySearch, summaryCategory]);

  const totalAvailable = useMemo(
    () => (stockSummary ?? []).reduce((sum, s) => sum + Number(s.availableQty ?? 0), 0),
    [stockSummary]
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventory', { page, search, state, warehouse }],
    queryFn: () =>
      api.get('/inventory', {
        params: { page, size: 20, search: search || undefined, state: state || undefined, warehouse: warehouse !== 'ALL' ? warehouse : undefined },
      }).then((r) => r.data ?? {}),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });

  const rawItems = useMemo(() => data?.content ?? data?.items ?? [], [data]);
  const items = useMemo(() => {
    if (!sortField) return rawItems;
    const compareFn = SORT_FIELDS[sortField];
    const sorted = [...rawItems].sort(compareFn);
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [rawItems, sortField, sortDir]);

  const currentPage = (data?.number ?? page) + 1;
  const totalPages  = data?.totalPages ?? (data?.hasNext ? page + 2 : currentPage);
  const totalItems  = data?.totalElements ?? items.length;

  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return field; }
      setSortDir('asc');
      return field;
    });
  }, []);

  const clearFilters = () => { setSearch(''); setState(''); setWarehouse('ALL'); setPage(0); };
  const hasFilters = search || state || warehouse !== 'ALL';

  const adjustMutation = useMutation({
    mutationFn: ({ id, quantity, reason }) => api.post('/inventory/adjust', { inventoryId: id, quantity: Number(quantity), reason }),
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setAdjustItem(null);
      setAdjustQty('');
    },
    onError: (err) => {
      if (err?.response?.status === 403) {
        toast.error('You do not have permission to adjust inventory');
        return;
      }
      toast.error(err?.response?.data?.detail || 'Failed to adjust stock');
    },
  });

  const alertMutation = useMutation({
    mutationFn: ({ skuId, threshold }) =>
      api.put(`/inventory/low-stock-threshold/${skuId}`, { threshold }),
    onSuccess: () => {
      toast.success('Low stock alert updated');
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      setAlertItem(null);
      setAlertThreshold('');
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update alert'),
  });

  const lowStockCount = useMemo(
    () => (stockSummary ?? []).filter((s) => s.isLowStock).length,
    [stockSummary]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Search and manage live stock across all warehouse locations."
        breadcrumbs={[{ label: 'Inventory' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => exportToExcel(items)} disabled={!items.length}>
              <Download className="size-4" />
              Export Excel
            </Button>
          </div>
        }
      />

      {/* ── Product-wise Available Stock Summary ── */}
      <Card className="glass-card rounded-[2rem] py-5">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer select-none flex-1"
              onClick={() => setSummaryOpen((v) => !v)}
            >
              <BarChart3 className="size-4 text-primary" />
              <span className="font-semibold text-sm">Available Stock — Product Summary</span>
              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5">
                {(stockSummary ?? []).length} SKUs
              </span>
              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5">
                {totalAvailable} available units
              </span>
              {lowStockCount > 0 && (
                <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold px-2 py-0.5 ring-1 ring-inset ring-rose-500/20 inline-flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  {lowStockCount} low stock
                </span>
              )}
              {summaryOpen
                ? <ChevronUp className="size-4 text-muted-foreground" />
                : <ChevronDown className="size-4 text-muted-foreground" />}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!(stockSummary ?? []).length}
              onClick={(e) => { e.stopPropagation(); exportSummaryToExcel(stockSummary ?? []); }}
            >
              <Download className="size-3 mr-1" /> Export
            </Button>
          </div>

          {summaryOpen && (
            <>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Filter by SKU or name…"
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                />
              </div>
              <Select value={summaryCategory} onValueChange={setSummaryCategory}>
                <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="overflow-hidden rounded-2xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/40">
                      <TableHead className="w-32">SKU Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right w-28">Available</TableHead>
                      <TableHead className="text-right w-28">Unavailable</TableHead>
                      <TableHead className="text-center w-32">Status</TableHead>
                      <TableHead className="text-center w-32">Alert Threshold</TableHead>
                      <TableHead className="text-right w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                        </TableRow>
                      ))
                    ) : filteredSummary.length ? (
                      filteredSummary.map((s) => (
                        <TableRow key={s.skuCode} className={`table-row-hover ${s.isLowStock ? 'bg-rose-500/5' : ''}`}>
                          <TableCell className="font-mono font-semibold text-primary">
                            <span className="inline-flex items-center gap-1.5">
                              {s.isLowStock && <AlertTriangle className="size-3.5 text-rose-500" />}
                              {s.skuCode}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{s.skuName || '—'}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center justify-center rounded-full font-bold text-sm px-3 py-0.5 min-w-[2.5rem] ${
                              s.isLowStock
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {Number(s.availableQty ?? 0).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-sm px-3 py-0.5 min-w-[2.5rem]">
                              {Number(s.unavailableQty ?? 0).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {s.isLowStock ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-semibold px-2.5 py-0.5 ring-1 ring-inset ring-rose-500/20">
                                <span className="size-1.5 rounded-full bg-rose-500" />
                                Low Stock
                              </span>
                            ) : s.status === 'AVAILABLE' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2.5 py-0.5 ring-1 ring-inset ring-emerald-500/20">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-semibold px-2.5 py-0.5 ring-1 ring-inset ring-rose-500/20">
                                <span className="size-1.5 rounded-full bg-rose-500" />
                                Unavailable
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.lowStockThreshold != null ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <Bell className="size-3" />
                                {s.lowStockThreshold}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setAlertItem(s);
                                setAlertThreshold(s.lowStockThreshold != null ? String(s.lowStockThreshold) : '');
                              }}
                            >
                              <Bell className="size-3 mr-1" /> Alert
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                          {summarySearch ? 'No products match the filter.' : 'No available stock found.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Set Low Stock Alert Dialog */}
      <Dialog open={!!alertItem} onOpenChange={(v) => !v && setAlertItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Low Stock Alert</DialogTitle>
            <DialogDescription>
              Alert when available stock for <span className="font-mono font-semibold">{alertItem?.skuCode}</span> falls at or below this threshold. Leave blank to remove the alert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Threshold Quantity</Label>
              <Input
                type="number"
                min={0}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="e.g. 10 (leave blank to disable)"
              />
            </div>
            {alertItem?.availableQty != null && (
              <p className="text-xs text-muted-foreground">
                Current available stock: <span className="font-semibold text-foreground">{Number(alertItem.availableQty).toLocaleString()}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertItem(null)}>Cancel</Button>
            {alertItem?.lowStockThreshold != null && (
              <Button
                variant="ghost"
                className="text-muted-foreground"
                disabled={alertMutation.isPending}
                onClick={() => alertMutation.mutate({ skuId: alertItem.skuId ?? alertItem.id, threshold: null })}
              >
                <BellOff className="size-3.5 mr-1" /> Remove Alert
              </Button>
            )}
            <Button
              disabled={alertMutation.isPending}
              onClick={() => alertMutation.mutate({
                skuId: alertItem.skuId ?? alertItem.id,
                threshold: alertThreshold === '' ? null : Number(alertThreshold),
              })}
            >
              <Bell className="size-3.5 mr-1" /> Save Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={(v) => !v && setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Adjust quantity for <span className="font-mono font-semibold">{adjustItem?.barcode}</span> (SKU: {adjustItem?.skuCode ?? adjustItem?.sku})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>New Quantity</Label>
              <Input type="number" min={0} value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="Enter new quantity" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CYCLE_COUNT">Cycle Count</SelectItem>
                  <SelectItem value="DAMAGE">Damage / Write-off</SelectItem>
                  <SelectItem value="CORRECTION">Data Correction</SelectItem>
                  <SelectItem value="RETURN">Customer Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>Cancel</Button>
            <Button
              disabled={!adjustQty || adjustMutation.isPending}
              onClick={() => adjustMutation.mutate({ id: adjustItem.id, quantity: adjustQty, reason: adjustReason })}
            >
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="glass-card rounded-[2rem] py-5">
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search SKU, barcode, batch..."
                value={search}
                onChange={(e) => { setPage(0); setSearch(e.target.value); }}
              />
            </div>

            <Select value={state || 'ALL'} onValueChange={(v) => { setPage(0); setState(v === 'ALL' ? '' : v); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All States</SelectItem>
                {INVENTORY_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={warehouse} onValueChange={(v) => { setPage(0); setWarehouse(v); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Warehouses</SelectItem>
                <SelectItem value="MAIN">Main</SelectItem>
                <SelectItem value="OVERFLOW">Overflow</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-3 text-xs">
                  <X className="size-3.5 mr-1" /> Clear
                </Button>
              )}
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
                {totalItems} records
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {search && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearch('')}>Search: {search} <X className="size-3" /></Badge>}
              {state && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setState('')}>{state} <X className="size-3" /></Badge>}
              {warehouse !== 'ALL' && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setWarehouse('ALL')}>{warehouse} <X className="size-3" /></Badge>}
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/40">
                  <SortableHead field="skuCode"   label="SKU"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead field="barcode"   label="Barcode"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead field="binBarcode" label="Bin"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead field="state"     label="State"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <SortableHead field="quantity"  label="Qty"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead field="updatedAt" label="Updated"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length ? (
                  items.map((item) => (
                    <TableRow key={item.id} className="table-row-hover">
                      <TableCell className="font-semibold">{item.skuCode ?? item.sku}</TableCell>
                      <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                      <TableCell className="font-mono text-xs font-medium text-primary">{item.binBarcode ?? item.bin ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={item.state} /></TableCell>
                      <TableCell className="text-muted-foreground">{item.batchNo ?? item.batch ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.expiryDate ? format(new Date(item.expiryDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM HH:mm') : '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAdjustItem(item); setAdjustQty(String(item.quantity ?? '')); }}>
                          <Sliders className="size-3 mr-1" /> Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                      No inventory matched the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{currentPage}</span> of <span className="font-medium text-foreground">{totalPages || 1}</span>
              {totalItems > 0 && <span className="ml-2 text-xs">({totalItems} total records)</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((v) => Math.max(0, v - 1))} disabled={page === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((v) => v + 1)} disabled={!data?.hasNext && currentPage >= totalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
