'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { Ship, Search, Package, Check, Truck, Calendar, Hash, List } from 'lucide-react';

const COURIERS = ['Blue Dart', 'Delhivery', 'DTDC', 'FedEx', 'Ekart', 'Shadowfax', 'Xpressbees', 'Other'];

const shipSchema = z.object({
  orderId: z.coerce.number().int().positive('Order ID is required'),
  awbNumber: z.string().min(1, 'AWB number is required'),
  courierName: z.string().min(1, 'Courier name is required'),
});

function ShipmentDetail({ result }) {
  const fields = [
    { icon: Hash,      label: 'Order ID',    value: result.orderId ?? result.salesOrderId },
    { icon: Ship,      label: 'AWB No.',     value: <span className="font-mono">{result.awbNumber}</span> },
    { icon: Truck,     label: 'Courier',     value: result.courierName },
    { icon: Check,     label: 'Status',      value: <StatusBadge status={result.status ?? 'SHIPPED'} /> },
    {
      icon: Calendar,
      label: 'Shipped At',
      value: result.shippedAt ? new Date(result.shippedAt).toLocaleString() : 'Ã¢â‚¬â€',
    },
  ];

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {fields.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3 text-sm border-b border-border/40 last:border-0">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground min-w-24">{label}</span>
          <span className="font-medium ml-auto text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ShippingPage() {
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(shipSchema) });

  // Packed orders ready to dispatch
  const { data: packedOrders, isLoading: packedLoading } = useQuery({
    queryKey: ['packed-orders'],
    queryFn: () => api.get('/orders').then((r) =>
      (r.data ?? []).filter((o) => (o.status ?? o.state ?? '').toUpperCase() === 'PACKED')
    ),
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: (data) => api.post('/shipping/confirm', data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`Shipment confirmed Ã¢â‚¬â€ AWB ${data.awbNumber ?? ''}`);
      setConfirmed(data);      setSelectedCourier('');      reset();
    },
    onError: () => toast.error('Failed to confirm shipment'),
  });

  const lookupMutation = useMutation({
    mutationFn: (id) => api.get(`/shipping/${id}`).then((r) => r.data),
    onSuccess: (data) => setLookupResult(data),
    onError: () => {
      setLookupResult(null);
      toast.error('No shipment record found for that order');
    },
  });

  const handleLookup = (e) => {
    e.preventDefault();
    if (lookupId) lookupMutation.mutate(lookupId);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Shipping" description="Confirm dispatch and look up shipment records." />
      {/* Packed Orders Queue */}
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
            <Check className="size-8 opacity-30" />
            <p className="text-sm">No packed orders waiting for dispatch</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-48 rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order #</TableHead>
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
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell><StatusBadge status={order.status ?? order.state} /></TableCell>
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
              <ShipmentDetail result={confirmed} />
              <Button variant="outline" onClick={() => setConfirmed(null)}>Confirm Another Shipment</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => confirmMutation.mutate(d))} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="orderId">Order ID</Label>
                <Input id="orderId" type="number" {...register('orderId')} placeholder="e.g. 1042" />
                {errors.orderId && <p className="text-xs text-destructive">{errors.orderId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="awbNumber">AWB Number</Label>
                <Input id="awbNumber" {...register('awbNumber')} placeholder="e.g. AWB-20260320-001" className="font-mono" />
                {errors.awbNumber && <p className="text-xs text-destructive">{errors.awbNumber.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="courierName">Courier</Label>
                <Select value={selectedCourier} onValueChange={(v) => { setSelectedCourier(v); setValue('courierName', v); }}>
                  <SelectTrigger id="courierName">
                    <SelectValue placeholder="Select courier…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.courierName && <p className="text-xs text-destructive">{errors.courierName.message}</p>}
              </div>
              <Button type="submit" disabled={confirmMutation.isPending} className="w-full">
                <Check className="size-4 mr-2" />
                Confirm Shipment
              </Button>
            </form>
          )}
        </div>

        {/* Lookup */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Look Up Shipment</h2>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2">
            <Input type="number" placeholder="Order ID" value={lookupId} onChange={(e) => setLookupId(e.target.value)} className="flex-1" />
            <Button type="submit" variant="outline" disabled={lookupMutation.isPending || !lookupId}>
              <Search className="size-4" />
            </Button>
          </form>

          {lookupResult ? (
            <div className="flex flex-col gap-4">
              <ShipmentDetail result={lookupResult} />
              {lookupResult.status === 'SHIPPED' && lookupResult.shippedAt && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Timeline</p>
                  <ol className="relative border-l border-border/60 ml-2 space-y-3">
                    {[
                      { label: 'Order Created', time: null },
                      { label: 'Picked & Packed', time: null },
                      { label: 'Dispatched', time: lookupResult.shippedAt ? new Date(lookupResult.shippedAt).toLocaleString() : null },
                    ].map(({ label, time }, i) => (
                      <li key={i} className="pl-4 relative">
                        <span className={`absolute -left-1.5 top-1 size-3 rounded-full border-2 ${i <= 2 ? 'bg-emerald-500 border-emerald-500' : 'bg-background border-border'}`} />
                        <p className="text-xs font-medium">{label}</p>
                        {time && <p className="text-xs text-muted-foreground">{time}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Package className="size-10 opacity-30" />
              <p className="text-sm">Enter an order ID to look up its shipment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
