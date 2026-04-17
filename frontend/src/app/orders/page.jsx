'use client';
export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Download, Eye, Loader2, Plus, Search, ShoppingCart, Trash2, X, XCircle,
  Phone, Mail, MapPin, Building2, PackageSearch,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import api from '@/lib/api';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { exportWmsWorkbook } from '@/lib/exportExcel';
import SlideOverForm from '@/components/ui/SlideOverForm';

const orderSchema = z.object({
  customerName:    z.string().min(1, 'Customer name is required'),
  customerPhone:   z.string().optional(),
  customerEmail:   z.string().email('Invalid email').optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  gstin:           z.string().optional(),
  lines: z.array(z.object({
    skuCode:  z.string().min(1, 'SKU code is required'),
    quantity: z.coerce.number().int().min(1, 'Minimum 1'),
  })).min(1, 'At least one line is required'),
});

const parseDate = (val) => {
  if (!val) return null;
  const iso = String(val).replace(' ', 'T');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const STATUS_TABS = ['ALL', 'PENDING', 'CREATED', 'RESERVED', 'PICKED', 'PACKED', 'SHIPPED', 'CANCELLED'];

async function exportOrdersToExcel(orders) {
  await exportWmsWorkbook({
    fileName: `orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Orders',
    title: 'WMS Sales Orders Export',
    columns: [
      { header: 'Order ID',    key: 'id',           width: 12, align: 'right' },
      { header: 'SO Number',   key: 'soNumber',      width: 16 },
      { header: 'Customer',    key: 'customerName',  width: 26 },
      { header: 'Phone',       key: 'customerPhone', width: 16 },
      { header: 'GSTIN',       key: 'gstin',         width: 18 },
      { header: 'Status',      key: 'status',        width: 14, align: 'center' },
      { header: 'Lines',       key: 'lineCount',     width: 10, align: 'right' },
      { header: 'Created At',  key: 'createdAt',     width: 20, align: 'center' },
    ],
    rows: orders.map((o) => ({
      id:           o.id,
      soNumber:     o.soNumber ?? '',
      customerName: o.customerName ?? '',
      customerPhone: o.customerPhone ?? '',
      gstin:        o.gstin ?? '',
      status:       o.status ?? '',
      lineCount:    o.lineCount ?? 0,
      createdAt:    o.createdAt ? format(parseDate(o.createdAt), 'dd MMM yyyy HH:mm') : '',
    })),
  });
  toast.success('Orders exported to Excel');
}

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [cancelDialogOrder, setCancelDialogOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then((r) => r.data ?? []),
    staleTime: 30_000,
    retry: false,
  });

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '', customerPhone: '', customerEmail: '',
      customerAddress: '', gstin: '',
      lines: [{ skuCode: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const createOrder = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: ({ data }) => {
      toast.success(`Order ${data.soNumber} created — pick tasks ready`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create order'),
  });

  const cancelOrder = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/cancel`),
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCancelDialogOrder(null);
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to cancel order'),
  });

  const filtered = useMemo(() => {
    let list = orders ?? [];
    if (activeTab !== 'ALL') list = list.filter((o) => (o.status ?? '').toUpperCase() === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        String(o.customerName ?? '').toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        String(o.soNumber ?? '').toLowerCase().includes(q) ||
        String(o.gstin ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const at = a.createdAt ? parseDate(a.createdAt)?.getTime() ?? 0 : 0;
      const bt = b.createdAt ? parseDate(b.createdAt)?.getTime() ?? 0 : 0;
      if (sortBy === 'oldest') return at - bt;
      if (sortBy === 'customer') return String(a.customerName ?? '').localeCompare(String(b.customerName ?? ''));
      return bt - at;
    });
  }, [orders, activeTab, search, sortBy]);

  const tabCounts = useMemo(() => {
    const map = { ALL: orders?.length ?? 0 };
    STATUS_TABS.slice(1).forEach((s) => {
      map[s] = (orders ?? []).filter((o) => (o.status ?? '').toUpperCase() === s).length;
    });
    return map;
  }, [orders]);

  const canPick = (status) => ['RESERVED', 'CREATED', 'PENDING'].includes((status ?? '').toUpperCase());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Create and manage B2B customer orders through the fulfilment cycle."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportOrdersToExcel(orders ?? [])}>
              <Download className="size-3.5 mr-1.5" /> Export Excel
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-3.5 mr-1.5" /> Create Order
            </Button>
          </div>
        }
      />

      {/* ── Create Order Sheet ── */}
      <SlideOverForm
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}
        title="New Sales Order"
        description="Fill in B2B customer details and order lines. Pick tasks are generated automatically."
      >
        <form onSubmit={handleSubmit((d) => createOrder.mutate(d))} className="space-y-5">

          {/* Customer Details */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5" /> Customer Details
            </p>
            <div className="space-y-1.5">
              <Label>Company / Customer Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Acme Corp Pvt. Ltd." {...register('customerName')} />
              {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Phone className="size-3" /> Phone</Label>
                <Input placeholder="+91 98765 43210" {...register('customerPhone')} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Mail className="size-3" /> Email</Label>
                <Input type="email" placeholder="orders@acme.com" {...register('customerEmail')} />
                {errors.customerEmail && <p className="text-xs text-destructive">{errors.customerEmail.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><MapPin className="size-3" /> Billing Address</Label>
              <Input placeholder="123 Industrial Area, Mumbai 400001" {...register('customerAddress')} />
            </div>
            <div className="space-y-1.5">
              <Label>GSTIN <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="22AAAAA0000A1Z5" className="font-mono uppercase" {...register('gstin')} />
            </div>
          </div>

          <Separator />

          {/* Order Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Lines</p>
              <Button type="button" size="sm" variant="outline" onClick={() => append({ skuCode: '', quantity: 1 })}>
                <Plus className="size-3.5 mr-1" /> Add Line
              </Button>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="rounded-xl border border-border/60 p-3 space-y-2 relative">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">SKU Code</Label>
                    <Input placeholder="e.g. SKU-001" className="h-8 text-sm" {...register(`lines.${i}.skuCode`)} />
                    {errors.lines?.[i]?.skuCode && <p className="text-[10px] text-destructive">{errors.lines[i].skuCode.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={1} className="h-8 text-sm" {...register(`lines.${i}.quantity`)} />
                    {errors.lines?.[i]?.quantity && <p className="text-[10px] text-destructive">{errors.lines[i].quantity.message}</p>}
                  </div>
                </div>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {errors.lines?.root && <p className="text-xs text-destructive">{errors.lines.root.message}</p>}
          </div>

          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
              {!createOrder.isPending && <Plus className="size-3.5 mr-1.5" />}
              Create Order
            </Button>
          </SheetFooter>
        </form>
      </SlideOverForm>

      {/* ── Order Detail Dialog ── */}
      <Dialog open={!!detailOrder} onOpenChange={(v) => !v && setDetailOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order {detailOrder?.soNumber ?? `#${detailOrder?.id}`}</DialogTitle>
            <DialogDescription>B2B customer details</DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="text-muted-foreground">Company</span>
                <span className="font-medium">{detailOrder.customerName}</span>
                {detailOrder.customerPhone && (<><span className="text-muted-foreground">Phone</span><span>{detailOrder.customerPhone}</span></>)}
                {detailOrder.customerEmail && (<><span className="text-muted-foreground">Email</span><span className="break-all">{detailOrder.customerEmail}</span></>)}
                {detailOrder.gstin && (<><span className="text-muted-foreground">GSTIN</span><span className="font-mono">{detailOrder.gstin}</span></>)}
                {detailOrder.customerAddress && (<><span className="text-muted-foreground">Address</span><span>{detailOrder.customerAddress}</span></>)}
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={detailOrder.status} />
                <span className="text-muted-foreground">Lines</span>
                <span>{detailOrder.lineCount ?? '—'}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailOrder(null)}>Close</Button>
            {detailOrder && canPick(detailOrder.status) && (
              <Button onClick={() => { setDetailOrder(null); router.push(`/picking?orderId=${detailOrder.id}`); }}>
                <PackageSearch className="size-3.5 mr-1.5" /> Start Picking
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={!!cancelDialogOrder} onOpenChange={(v) => !v && setCancelDialogOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order #{cancelDialogOrder?.id}</DialogTitle>
            <DialogDescription>
              Cancel order for <strong>{cancelDialogOrder?.customerName}</strong>? Reserved inventory will be released.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOrder(null)}>Keep Order</Button>
            <Button variant="destructive" disabled={cancelOrder.isPending} onClick={() => cancelOrder.mutate(cancelDialogOrder.id)}>
              {cancelOrder.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Table ── */}
      <div className="glass-card overflow-hidden rounded-[2rem]">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_TABS.map((tab) => {
                const active = activeTab === tab;
                const cnt = tabCounts[tab] ?? 0;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()} ({cnt})
                  </button>
                );
              })}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-9 pr-8 text-sm"
                  placeholder="Search customer, SO#, GSTIN…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <select
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="customer">Customer A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-transparent">
              <TableHead>SO Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filtered.length ? (
              filtered.map((order) => (
                <TableRow key={order.id} className="table-row-hover">
                  <TableCell className="font-mono text-xs font-bold text-primary">{order.soNumber ?? `#${order.id}`}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{order.customerName}</p>
                      {order.customerAddress && <p className="text-xs text-muted-foreground truncate max-w-40">{order.customerAddress}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {order.customerPhone && <p className="text-xs text-muted-foreground">{order.customerPhone}</p>}
                      {order.customerEmail && <p className="text-xs text-muted-foreground truncate max-w-36">{order.customerEmail}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{order.gstin || '—'}</TableCell>
                  <TableCell className="font-semibold">{order.lineCount ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {order.createdAt ? format(parseDate(order.createdAt), 'dd MMM yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDetailOrder(order)}>
                        <Eye className="mr-1 size-3.5" /> Details
                      </Button>
                      {canPick(order.status) && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => router.push(`/picking?orderId=${order.id}`)}>
                          <PackageSearch className="mr-1 size-3.5" /> Pick
                        </Button>
                      )}
                      {!['SHIPPED', 'CANCELLED'].includes((order.status ?? '').toUpperCase()) && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setCancelDialogOrder(order)}
                        >
                          <XCircle className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto mb-3 size-8 opacity-30" />
                  {search || activeTab !== 'ALL' ? 'No orders match the current filter.' : 'No sales orders yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
