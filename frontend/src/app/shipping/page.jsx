'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { Ship, Search, Package, Check, Truck, Calendar, Hash, List, CheckCircle2 } from 'lucide-react';

const COURIERS = ['Blue Dart', 'Delhivery', 'DTDC', 'FedEx', 'Ekart', 'Shadowfax', 'Xpressbees', 'Other'];

const shipSchema = z.object({
  orderId:     z.coerce.number().int().positive('Order ID is required'),
  awbNumber:   z.string().min(1, 'AWB number is required'),
  courierName: z.string().min(1, 'Courier name is required'),
});

export default function ShippingPage() {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(shipSchema),
  });

  const { data: packedOrders, isLoading: packedLoading } = useQuery({
    queryKey: ['packed-orders'],
    queryFn: () => api.get('/orders').then((r) =>
      (r.data ?? []).filter((o) => (o.status ?? '').toUpperCase() === 'PACKED')
    ),
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: false,
  });

  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments-list'],
    queryFn: () => api.get('/shipping').then((r) => r.data ?? []),
    staleTime: 30_000,
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: (data) => api.post('/shipping/confirm', data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`Shipment confirmed — AWB ${data.awbNumber}`);
      setConfirmed(data);
      setSelectedCourier('');
      reset();
      queryClient.invalidateQueries({ queryKey: ['packed-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipments-list'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to confirm shipment'),
  });

  const lookupMutation = useMutation({
    mutationFn: (id) => api.get(`/shipping/${id}`).then((r) => r.data),
    onSuccess: (data) => setLookupResult(data),
    onError: () => { setLookupResult(null); toast.error('No shipment record found'); },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Shipping" description="Confirm dispatch and track shipment records." />

      {/* Packed orders queue */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <List className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Orders Ready to Dispatch</h2>
          <span className="ml-auto text-xs text-muted-foreground">{packedOrders?.length ?? 0} orders</span>
        </div>
        {packedLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (packedOrders?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <CheckCircle2 className="size-8 opacity-30" />
            <p className="text-sm">No packed orders waiting for dispatch</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-48 rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order #</TableHead>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packedOrders.map((order) => (
                  <TableRow key={order.id} className="table-row-hover">
                    <TableCell className="font-bold text-primary">#{order.id}</TableCell>
                    <TableCell className="font-mono text-xs">{order.soNumber ?? '—'}</TableCell>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                        setValue('orderId', order.id);
                        setConfirmed(null);
                      }}>
                        <Ship className="size-3 mr-1" /> Dispatch
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Confirm shipment */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Ship className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Confirm Shipment</h2>
          </div>

          {confirmed ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <Check className="size-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">Shipment Confirmed</p>
                <p className="text-xs text-muted-foreground mt-1">AWB: {confirmed.awbNumber}</p>
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden text-sm">
                {[
                  { label: 'Order',    value: `#${confirmed.orderId}` },
                  { label: 'SO No.',   value: confirmed.soNumber },
                  { label: 'Customer', value: confirmed.customerName },
                  { label: 'AWB',      value: <span className="font-mono">{confirmed.awbNumber}</span> },
                  { label: 'Courier',  value: confirmed.courierName },
                  { label: 'Shipped',  value: confirmed.shippedAt ? format(new Date(confirmed.shippedAt), 'dd MMM yyyy HH:mm') : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground min-w-20">{label}</span>
                    <span className="font-medium ml-auto">{value}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => setConfirmed(null)}>Confirm Another Shipment</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => confirmMutation.mutate(d))} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Order ID</Label>
                <Input type="number" {...register('orderId')} placeholder="e.g. 42" />
                {errors.orderId && <p className="text-xs text-destructive">{errors.orderId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>AWB Number</Label>
                <Input {...register('awbNumber')} placeholder="e.g. AWB-20260320-001" className="font-mono" />
                {errors.awbNumber && <p className="text-xs text-destructive">{errors.awbNumber.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Courier</Label>
                <Select value={selectedCourier} onValueChange={(v) => { setSelectedCourier(v); setValue('courierName', v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select courier…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.courierName && <p className="text-xs text-destructive">{errors.courierName.message}</p>}
              </div>
              <Button type="submit" disabled={confirmMutation.isPending} className="w-full">
                <Check className="size-4 mr-2" /> Confirm Shipment
              </Button>
            </form>
          )}
        </div>

        {/* Lookup + history */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Look Up Shipment</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (lookupId) lookupMutation.mutate(lookupId); }} className="flex gap-2">
            <Input type="number" placeholder="Order ID" value={lookupId} onChange={(e) => setLookupId(e.target.value)} className="flex-1" />
            <Button type="submit" variant="outline" disabled={lookupMutation.isPending || !lookupId}>
              <Search className="size-4" />
            </Button>
          </form>

          {lookupResult ? (
            <div className="rounded-xl border border-border/60 overflow-hidden text-sm">
              {[
                { label: 'Order',    value: `#${lookupResult.orderId}` },
                { label: 'Customer', value: lookupResult.customerName },
                { label: 'AWB',      value: <span className="font-mono">{lookupResult.awbNumber}</span> },
                { label: 'Courier',  value: lookupResult.courierName },
                { label: 'Status',   value: <StatusBadge status="SHIPPED" /> },
                { label: 'Shipped',  value: lookupResult.shippedAt ? format(new Date(lookupResult.shippedAt), 'dd MMM yyyy HH:mm') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground min-w-20">{label}</span>
                  <span className="font-medium ml-auto">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
              <Package className="size-10 opacity-30" />
              <p className="text-sm">Enter an order ID to look up its shipment</p>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Shipments</p>
            {shipmentsLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (shipments?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No shipments yet</p>
            ) : (
              <div className="overflow-auto max-h-48 rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Order</TableHead>
                      <TableHead>AWB</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(shipments ?? []).slice(0, 20).map((s) => (
                      <TableRow key={s.id} className="table-row-hover">
                        <TableCell className="font-bold text-primary text-xs">#{s.orderId}</TableCell>
                        <TableCell className="font-mono text-xs">{s.awbNumber}</TableCell>
                        <TableCell className="text-xs">{s.courierName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.shippedAt ? format(new Date(s.shippedAt), 'dd MMM yy') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
