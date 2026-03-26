'use client';
export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { format } from 'date-fns';
import { Download, Eye, Loader2, Plus, Search, ShoppingCart, Trash2, X, XCircle, MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import api from '@/lib/api';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const orderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  lines: z.array(z.object({
    skuCode: z.string().min(1, 'SKU code is required'),
    quantity: z.coerce.number().int().min(1, 'Minimum 1'),
  })),
});

const STATUS_TABS = ['ALL', 'OPEN', 'RESERVED', 'PICKED', 'PACKED', 'SHIPPED', 'CANCELLED'];

function exportOrdersToExcel(orders) {
  const BOM = '\uFEFF';
  const headers = ['Order ID', 'SO Number', 'Customer', 'Status', 'Created At'];
  const rows = orders.map((o) => [
    o.id, o.soNumber ?? '', o.customerName ?? '', o.status ?? o.state ?? '',
    o.createdAt ? format(new Date(o.createdAt), 'dd MMM yyyy HH:mm') : '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  toast.success('Orders exported');
}

function PickTaskList({ orderId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['order-pick-tasks', orderId],
    queryFn: () => api.get(`/orders/${orderId}/pick-tasks`).then((r) => r.data ?? []),
    enabled: Boolean(orderId),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 pb-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (!data?.length) {
    return <p className="px-4 pb-6 text-sm text-muted-foreground">No pick tasks generated yet.</p>;
  }
  return (
    <div className="px-4 pb-6">
      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>#</TableHead><TableHead>SKU</TableHead><TableHead>Bin</TableHead>
              <TableHead>Qty</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((task, i) => (
              <TableRow key={task.id} className="table-row-hover">
                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                <TableCell className="font-medium font-mono text-xs">{task.skuCode || task.skuId}</TableCell>
                <TableCell className="font-mono text-xs text-primary">{task.binBarcode || 'â€”'}</TableCell>
                <TableCell className="font-semibold">{task.quantity}</TableCell>
                <TableCell><StatusBadge status={task.state} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cancelDialogOrder, setCancelDialogOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then((r) => r.data ?? []),
    staleTime: 30_000,
    retry: false,
  });

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: { customerName: '', lines: [{ skuCode: '', quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const createOrder = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: ({ data }) => {
      toast.success(`Order #${data.id || ''} created â€” pick tasks ready`);
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
  const filteredOrders = useMemo(() => {
    let list = orders ?? [];
    if (activeTab !== 'ALL') list = list.filter((o) => (o.status ?? o.state ?? '').toUpperCase() === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        String(o.customerName ?? '').toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        String(o.soNumber ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeTab, search]);

  const tabCounts = useMemo(() => {
    const map = { ALL: orders?.length ?? 0 };
    STATUS_TABS.slice(1).forEach((s) => {
      map[s] = (orders ?? []).filter((o) => (o.status ?? o.state ?? '').toUpperCase() === s).length;
    });
    return map;
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Create and manage customer orders through the fulfilment cycle."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportOrdersToExcel(orders ?? [])}>
              <Download className="size-3.5 mr-1.5" /> Export
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-3.5 mr-1.5" /> Create Order
            </Button>
          </div>
        }
      />

      {/* Create Order Sheet */}
      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>New Sales Order</SheetTitle>
                  <SheetDescription>Add customer details and order lines. Pick tasks will be generated automatically.</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit((d) => createOrder.mutate(d))} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input id="customerName" placeholder="e.g. Acme Corp" {...register('customerName')} />
                    {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Order Lines</Label>
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
                  </div>
                  <SheetFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" disabled={createOrder.isPending}>
                      {createOrder.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
                      Create Order
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelDialogOrder} onOpenChange={(v) => !v && setCancelDialogOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order #{cancelDialogOrder?.id}</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this order for <strong>{cancelDialogOrder?.customerName}</strong>? This action cannot be undone.</DialogDescription>
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
        <div className="glass-card overflow-hidden rounded-[2rem]">
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 pt-4 pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status tabs */}
            <div className="flex overflow-x-auto gap-0 hide-scrollbar">
              {STATUS_TABS.map((tab) => {
                const active = activeTab === tab;
                const cnt = tabCounts[tab] ?? 0;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative whitespace-nowrap px-3 pb-3 pt-2 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      active ? 'tab-active text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'ALL' ? 'All Orders' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                    {cnt > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Search */}
            <div className="relative pb-3 w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder="Search customer, order #â€¦"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableHead>Order #</TableHead>
              <TableHead>SO Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filteredOrders.length ? (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="table-row-hover">
                  <TableCell className="font-bold text-primary">#{order.id}</TableCell>
                  <TableCell className="font-mono text-xs">{order.soNumber ?? 'â€”'}</TableCell>
                  <TableCell className="font-medium">{order.customerName}</TableCell>
                  <TableCell><StatusBadge status={order.status ?? order.state} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : 'â€”'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Drawer>
                        <DrawerTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            <Eye className="size-3.5 mr-1" /> Pick Tasks
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Order #{order.id} — {order.customerName}</DrawerTitle>
                            <DrawerDescription>Pick tasks generated for this order.</DrawerDescription>
                          </DrawerHeader>
                          <PickTaskList orderId={order.id} />
                        </DrawerContent>
                      </Drawer>
                      {!['SHIPPED', 'CANCELLED'].includes((order.status ?? order.state ?? '').toUpperCase()) && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setCancelDialogOrder(order)}>
                          <XCircle className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
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

