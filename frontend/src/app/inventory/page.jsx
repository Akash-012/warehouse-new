'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download, Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  RefreshCw, X, Sliders, Boxes, Package, CheckCircle2, Eye, Pencil,
  Plus, Trash2, AlertTriangle, Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import PermissionGate from '@/components/PermissionGate';
import SlideOverForm from '@/components/ui/SlideOverForm';
import api from '@/lib/api';
import { P } from '@/lib/permissions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SheetFooter } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportWmsWorkbook } from '@/lib/exportExcel';

// ─── constants ────────────────────────────────────────────────────────────────

const INVENTORY_STATES = ['AVAILABLE', 'RECEIVED', 'IN_PUTAWAY', 'RESERVED', 'PICKED', 'PACKED', 'SHIPPED'];

const schema = z.object({
  skuId:    z.coerce.number({ invalid_type_error: 'SKU is required' }).int().positive('SKU is required'),
  binId:    z.union([z.coerce.number().int().positive(), z.literal(''), z.literal('NONE')]).optional(),
  barcode:  z.string().min(1, 'Barcode / serial is required'),
  batchNo:  z.string().optional(),
  quantity: z.coerce.number({ invalid_type_error: 'Quantity is required' }).int().min(0, 'Must be 0 or more'),
  state:    z.enum(INVENTORY_STATES),
});

// ─── helpers ──────────────────────────────────────────────────────────────────

const SORT_FNS = {
  skuCode:    (a, b) => String(a.skuCode ?? '').localeCompare(String(b.skuCode ?? '')),
  skuName:    (a, b) => String(a.skuName ?? '').localeCompare(String(b.skuName ?? '')),
  barcode:    (a, b) => String(a.barcode ?? '').localeCompare(String(b.barcode ?? '')),
  binBarcode: (a, b) => String(a.binBarcode ?? '').localeCompare(String(b.binBarcode ?? '')),
  state:      (a, b) => String(a.state ?? '').localeCompare(String(b.state ?? '')),
  quantity:   (a, b) => (a.quantity ?? 0) - (b.quantity ?? 0),
  updatedAt:  (a, b) => new Date(a.updatedAt ?? 0) - new Date(b.updatedAt ?? 0),
};

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="ml-1 size-3 text-muted-foreground/40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="ml-1 size-3 text-primary" />
    : <ArrowDown className="ml-1 size-3 text-primary" />;
}

function SortableHead({ field, label, sortField, sortDir, onSort, className = '' }) {
  return (
    <TableHead className={`cursor-pointer select-none hover:text-foreground transition-colors ${className}`} onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-0.5">{label}<SortIcon field={field} sortField={sortField} sortDir={sortDir} /></span>
    </TableHead>
  );
}

async function exportToExcel(items) {
  await exportWmsWorkbook({
    fileName: `inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Inventory',
    title: 'WMS Inventory Export',
    columns: [
      { header: 'SKU Code',   key: 'skuCode',    width: 16 },
      { header: 'SKU Name',   key: 'skuName',    width: 28 },
      { header: 'Barcode',    key: 'barcode',    width: 24 },
      { header: 'Bin',        key: 'binBarcode', width: 16 },
      { header: 'Warehouse',  key: 'warehouseName', width: 20 },
      { header: 'State',      key: 'state',      width: 14, align: 'center' },
      { header: 'Batch',      key: 'batchNo',    width: 20 },
      { header: 'Quantity',   key: 'quantity',   width: 12, align: 'right' },
      { header: 'Updated At', key: 'updatedAt',  width: 22, align: 'center' },
    ],
    rows: items.map((item) => ({
      skuCode:       item.skuCode ?? '',
      skuName:       item.skuName ?? '',
      barcode:       item.barcode ?? '',
      binBarcode:    item.binBarcode ?? '',
      warehouseName: item.warehouseName ?? '',
      state:         item.state ?? '',
      batchNo:       item.batchNo ?? '',
      quantity:      item.quantity ?? 0,
      updatedAt:     item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm') : '',
    })),
  });
  toast.success('Inventory exported to Excel');
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={`text-sm text-right font-medium ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const queryClient = useQueryClient();

  // filter / sort / pagination
  const [page, setPage]           = useState(0);
  const [search, setSearch]       = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [warehouse, setWarehouse] = useState('ALL');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir]     = useState('asc');

  // dialogs
  const [formOpen, setFormOpen]     = useState(false);
  const [formMode, setFormMode]     = useState('create'); // 'create' | 'edit'
  const [viewItem, setViewItem]     = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustQty, setAdjustQty]   = useState('');
  const [adjustReason, setAdjustReason] = useState('CYCLE_COUNT');

  // form
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { skuId: '', binId: 'NONE', barcode: '', batchNo: '', quantity: 0, state: 'AVAILABLE' },
  });

  // ── queries ────────────────────────────────────────────────────────────────

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventory', { page, search, stateFilter, warehouse }],
    queryFn: () => api.get('/inventory', {
      params: {
        page, size: 20,
        search:    search || undefined,
        state:     stateFilter || undefined,
        warehouse: warehouse !== 'ALL' ? warehouse : undefined,
      },
    }).then((r) => r.data ?? {}),
    staleTime: 30_000,
    retry: false,
  });

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary', { search, stateFilter, warehouse }],
    queryFn: () => api.get('/inventory/summary', {
      params: {
        search:    search || undefined,
        state:     stateFilter || undefined,
        warehouse: warehouse !== 'ALL' ? warehouse : undefined,
      },
    }).then((r) => r.data ?? {}),
    staleTime: 30_000,
    retry: false,
  });

  const { data: meta } = useQuery({
    queryKey: ['inventory-meta'],
    queryFn: () => api.get('/inventory/meta').then((r) => r.data ?? {}),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const skuOptions       = useMemo(() => meta?.skus ?? [], [meta]);
  const binOptions       = useMemo(() => meta?.bins ?? [], [meta]);
  const warehouseOptions = useMemo(() => meta?.warehouses ?? [], [meta]);
  const stateOptions     = useMemo(() => meta?.states ?? INVENTORY_STATES, [meta]);

  // ── derived data ───────────────────────────────────────────────────────────

  const rawItems = useMemo(() => data?.content ?? data?.items ?? [], [data]);
  const items = useMemo(() => {
    if (!sortField || !SORT_FNS[sortField]) return rawItems;
    const sorted = [...rawItems].sort(SORT_FNS[sortField]);
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [rawItems, sortField, sortDir]);

  const currentPage    = (data?.number ?? page) + 1;
  const totalPages     = data?.totalPages ?? (data?.hasNext ? page + 2 : currentPage);
  const totalItems     = data?.totalElements ?? items.length;
  const totalQuantity  = Number(summary?.totalQuantity ?? items.reduce((s, i) => s + Number(i.quantity ?? 0), 0));
  const availableQty   = Number(summary?.availableQuantity ?? 0);

  const hasFilters = search || stateFilter || warehouse !== 'ALL';

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleSort = (field) => {
    setSortField((prev) => {
      if (prev === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return field; }
      setSortDir('asc');
      return field;
    });
  };

  const clearFilters = () => { setSearch(''); setStateFilter(''); setWarehouse('ALL'); setPage(0); };

  const openCreate = () => {
    reset({ skuId: skuOptions[0]?.id ?? '', binId: 'NONE', barcode: '', batchNo: '', quantity: 0, state: 'AVAILABLE' });
    setFormMode('create');
    setFormOpen(true);
  };

  const openEdit = async (item) => {
    try {
      const { data: detail } = await api.get(`/inventory/${item.id}`);
      reset({
        skuId:    detail.skuId ? String(detail.skuId) : '',
        binId:    detail.binId ? String(detail.binId) : 'NONE',
        barcode:  detail.barcode ?? detail.serialNo ?? '',
        batchNo:  detail.batchNo ?? '',
        quantity: Number(detail.quantity ?? 0),
        state:    detail.state ?? 'AVAILABLE',
      });
      setFormMode('edit');
      setFormOpen(true);
      // store id for submit
      setEditId(detail.id);
    } catch {
      toast.error('Could not load item details');
    }
  };

  const [editId, setEditId] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
  };

  // ── mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/inventory', payload),
    onSuccess: () => { toast.success('Inventory item created'); invalidate(); setFormOpen(false); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/inventory/${id}`, payload),
    onSuccess: () => { toast.success('Inventory item updated'); invalidate(); setFormOpen(false); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update item'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/inventory/${id}`),
    onSuccess: () => { toast.success('Inventory item deleted'); invalidate(); setDeleteItem(null); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete item'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, quantity, reason }) =>
      api.post('/inventory/adjust', { inventoryId: id, quantity: Number(quantity), reason }),
    onSuccess: () => { toast.success('Stock adjusted'); invalidate(); setAdjustItem(null); setAdjustQty(''); },
    onError: (err) => {
      if (err?.response?.status === 403) { toast.error('You do not have permission to adjust stock'); return; }
      toast.error(err?.response?.data?.detail || 'Adjustment failed');
    },
  });

  const onSubmit = (values) => {
    const payload = {
      skuId:    Number(values.skuId),
      binId:    values.binId && values.binId !== 'NONE' ? Number(values.binId) : null,
      barcode:  values.barcode.trim(),
      batchNo:  values.batchNo?.trim() ?? '',
      quantity: Number(values.quantity),
      state:    values.state,
    };
    if (formMode === 'edit' && editId) {
      updateMutation.mutate({ id: editId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── form fields ────────────────────────────────────────────────────────────

  const FormBody = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* SKU */}
      <div className="space-y-1.5">
        <Label htmlFor="skuId">SKU <span className="text-destructive">*</span></Label>
        <select
          id="skuId"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('skuId', { valueAsNumber: true })}
        >
          <option value="">Select SKU</option>
          {skuOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.skuCode}{s.description ? ` — ${s.description}` : ''}
            </option>
          ))}
        </select>
        {errors.skuId && <p className="text-xs text-destructive">{errors.skuId.message}</p>}
      </div>

      {/* Bin */}
      <div className="space-y-1.5">
        <Label htmlFor="binId">Bin Location</Label>
        <select
          id="binId"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('binId')}
        >
          <option value="NONE">No bin assigned</option>
          {binOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.barcode}</option>
          ))}
        </select>
      </div>

      {/* Barcode + Batch */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="barcode">Barcode / Serial <span className="text-destructive">*</span></Label>
          <Input id="barcode" placeholder="e.g. SN-00123" {...register('barcode')} />
          {errors.barcode && <p className="text-xs text-destructive">{errors.barcode.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="batchNo">Batch Number</Label>
          <Input id="batchNo" placeholder="e.g. BATCH-2024-01" {...register('batchNo')} />
        </div>
      </div>

      {/* Quantity + State */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Quantity <span className="text-destructive">*</span></Label>
          <Input id="quantity" type="number" min={0} {...register('quantity', { valueAsNumber: true })} />
          {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <select
            id="state"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('state')}
          >
            {stateOptions.map((s) => (
              <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <SheetFooter className="pt-2">
        <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>
          {formMode === 'create'
            ? <><Plus className="mr-1.5 size-3.5" />Create Item</>
            : <><CheckCircle2 className="mr-1.5 size-3.5" />Save Changes</>}
        </Button>
      </SheetFooter>
    </form>
  );

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      <PageHeader
        title="Inventory"
        description="Manage live stock across all warehouse locations."
        breadcrumbs={[{ label: 'Inventory' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <PermissionGate permission={P.INVENTORY_ADJUST}>
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Plus className="size-4" /> Create Item
              </Button>
            </PermissionGate>
            <Button size="sm" onClick={() => exportToExcel(items)} disabled={!items.length}>
              <Download className="size-4" /> Export Excel
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="glass-card rounded-2xl py-4">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory Items</p>
              <p className="mt-1 text-2xl font-semibold">{Number(summary?.totalItems ?? totalItems)}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600"><Boxes className="size-5" /></div>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl py-4">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Quantity</p>
              <p className="mt-1 text-2xl font-semibold">{totalQuantity.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600"><Package className="size-5" /></div>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl py-4">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Qty</p>
              <p className="mt-1 text-2xl font-semibold">{availableQty.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600"><CheckCircle2 className="size-5" /></div>
          </CardContent>
        </Card>
      </div>

      {/* ── SlideOverForm: Create / Edit ──────────────────────────────────── */}
      <SlideOverForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) { setEditId(null); } }}
        title={formMode === 'create' ? 'Create Inventory Item' : 'Edit Inventory Item'}
        description={formMode === 'create'
          ? 'Add a new stock record to the warehouse.'
          : 'Update the details for this inventory item.'}
      >
        {FormBody}
      </SlideOverForm>

      {/* ── View Detail Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!viewItem} onOpenChange={(v) => !v && setViewItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Inventory Detail
            </DialogTitle>
            <DialogDescription>Full details for this stock record.</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="mt-1 space-y-0 rounded-xl border border-border bg-muted/30 px-4 py-2">
              <DetailRow label="ID"            value={viewItem.id} />
              <DetailRow label="SKU Code"      value={viewItem.skuCode} mono />
              <DetailRow label="SKU Name"      value={viewItem.skuName} />
              <DetailRow label="Barcode"       value={viewItem.barcode} mono />
              <DetailRow label="Bin"           value={viewItem.binBarcode} mono />
              <DetailRow label="Warehouse"     value={viewItem.warehouseName} />
              <DetailRow label="Batch"         value={viewItem.batchNo} />
              <DetailRow label="Quantity"      value={viewItem.quantity?.toLocaleString()} />
              <DetailRow label="State"         value={<StatusBadge status={viewItem.state} />} />
              <DetailRow label="Updated"       value={viewItem.updatedAt ? format(new Date(viewItem.updatedAt), 'dd MMM yyyy HH:mm') : undefined} />
              <DetailRow label="Created"       value={viewItem.createdAt ? format(new Date(viewItem.createdAt), 'dd MMM yyyy HH:mm') : undefined} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
            <PermissionGate permission={P.INVENTORY_ADJUST}>
              <Button onClick={() => { setViewItem(null); openEdit(viewItem); }}>
                <Pencil className="mr-1.5 size-3.5" /> Edit
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Stock Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!adjustItem} onOpenChange={(v) => !v && setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Set new quantity for <span className="font-mono font-semibold">{adjustItem?.skuCode}</span>
              {adjustItem?.binBarcode ? <> in bin <span className="font-mono font-semibold">{adjustItem.binBarcode}</span></> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>New Quantity</Label>
              <Input
                type="number" min={0}
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="Enter new quantity"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              >
                <option value="CYCLE_COUNT">Cycle Count</option>
                <option value="DAMAGE">Damage / Write-off</option>
                <option value="CORRECTION">Data Correction</option>
                <option value="RETURN">Customer Return</option>
              </select>
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

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!deleteItem} onOpenChange={(v) => !v && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" /> Delete Inventory Item
            </DialogTitle>
            <DialogDescription>
              Permanently delete <span className="font-mono font-semibold">{deleteItem?.barcode ?? deleteItem?.skuCode}</span>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteItem?.id && deleteMutation.mutate(deleteItem.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <Card className="glass-card rounded-[2rem] py-5">
        <CardContent className="space-y-4">

          {/* Filter bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search SKU, barcode, batch…"
                value={search}
                onChange={(e) => { setPage(0); setSearch(e.target.value); }}
              />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <Select value={stateFilter || 'ALL'} onValueChange={(v) => { setPage(0); setStateFilter(v === 'ALL' ? '' : v); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All States</SelectItem>
                {INVENTORY_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replaceAll('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={warehouse} onValueChange={(v) => { setPage(0); setWarehouse(v); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Warehouse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Warehouses</SelectItem>
                {warehouseOptions.map((w) => (
                  <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-3 text-xs">
                  <X className="size-3 mr-1" /> Clear
                </Button>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                <SlidersHorizontal className="size-3" />
                {totalItems} records
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {search && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearch('')}>
                  Search: {search} <X className="size-3" />
                </Badge>
              )}
              {stateFilter && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setStateFilter('')}>
                  {stateFilter.replaceAll('_', ' ')} <X className="size-3" />
                </Badge>
              )}
              {warehouse !== 'ALL' && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setWarehouse('ALL')}>
                  {warehouse} <X className="size-3" />
                </Badge>
              )}
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/40">
                  <SortableHead field="skuCode"    label="SKU"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="hidden md:table-cell">SKU Name</TableHead>
                  <SortableHead field="barcode"    label="Barcode"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead field="binBarcode" label="Bin"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHead field="state"      label="State"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="hidden lg:table-cell">Batch</TableHead>
                  <SortableHead field="quantity"   label="Qty"      sortField={sortField} sortDir={sortDir} onSort={handleSort} className="text-right" />
                  <SortableHead field="updatedAt"  label="Updated"  sortField={sortField} sortDir={sortDir} onSort={handleSort} className="hidden xl:table-cell" />
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
                      <TableCell className="font-semibold">{item.skuCode}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-40 truncate">{item.skuName ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                      <TableCell className="font-mono text-xs font-medium text-primary">{item.binBarcode ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={item.state} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{item.batchNo ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{item.quantity?.toLocaleString()}</TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setViewItem(item)}
                          >
                            <Eye className="size-3" />
                            <span className="hidden sm:inline ml-1">View</span>
                          </Button>
                          <PermissionGate permission={P.INVENTORY_ADJUST}>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="size-3" />
                              <span className="hidden sm:inline ml-1">Edit</span>
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => { setAdjustItem(item); setAdjustQty(String(item.quantity ?? '')); }}
                            >
                              <Sliders className="size-3" />
                              <span className="hidden sm:inline ml-1">Adjust</span>
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteItem(item)}
                            >
                              <Trash2 className="size-3" />
                              <span className="hidden sm:inline ml-1">Delete</span>
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Boxes className="size-10 opacity-25" />
                        <p className="text-sm">
                          {hasFilters ? 'No inventory matched the current filters.' : 'No inventory records yet.'}
                        </p>
                        {hasFilters && (
                          <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
              <span className="font-medium text-foreground">{totalPages || 1}</span>
              {totalItems > 0 && <span className="ml-2 text-xs">({totalItems} total)</span>}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((v) => Math.max(0, v - 1))}
                disabled={page === 0}
              >
                ← Previous
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((v) => v + 1)}
                disabled={!data?.hasNext && currentPage >= totalPages}
              >
                Next →
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
