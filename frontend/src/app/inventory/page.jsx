'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, X, Sliders } from 'lucide-react';
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

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventory', { page, search, state, warehouse }],
    queryFn: () =>
      api.get('/inventory', {
        params: { page, size: 20, search: search || undefined, state: state || undefined, warehouse: warehouse !== 'ALL' ? warehouse : undefined },
      }).then((r) => r.data ?? {}),
    staleTime: 30_000,
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
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to adjust stock'),
  });

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
                placeholder="Search SKU, barcode, batchÃ¢â‚¬Â¦"
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
                  <SortableHead field="quantity"  label="Qty"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead field="updatedAt" label="Updated"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length ? (
                  items.map((item) => (
                    <TableRow key={item.id} className="table-row-hover">
                      <TableCell className="font-semibold">{item.skuCode ?? item.sku}</TableCell>
                      <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                      <TableCell className="font-mono text-xs font-medium text-primary">{item.binBarcode ?? item.bin ?? 'Ã¢â‚¬â€'}</TableCell>
                      <TableCell><StatusBadge status={item.state} /></TableCell>
                      <TableCell className="text-muted-foreground">{item.batchNo ?? item.batch ?? 'Ã¢â‚¬â€'}</TableCell>
                      <TableCell className="font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM HH:mm') : 'Ã¢â‚¬â€'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAdjustItem(item); setAdjustQty(String(item.quantity ?? '')); }}>
                          <Sliders className="size-3 mr-1" /> Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
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
              <Button variant="outline" size="sm" onClick={() => setPage((v) => Math.max(0, v - 1))} disabled={page === 0}>Ã¢â€ Â Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((v) => v + 1)} disabled={!data?.hasNext && currentPage >= totalPages}>Next Ã¢â€ â€™</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
