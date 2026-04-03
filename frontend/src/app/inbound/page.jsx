'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { format } from 'date-fns';
import { Download, Loader2, Package, Plus, Search, Trash2, X, ClipboardList } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import {
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SlideOverForm from '@/components/ui/SlideOverForm';
import api from '@/lib/api';
import { exportWmsWorkbook } from '@/lib/exportExcel';
import { toast } from 'sonner';

const receiveSchema = z.object({
  poId: z.coerce.number().int().positive('PO ID is required'),
  lines: z.array(z.object({
    skuCode: z.string().min(1, 'SKU code is required'),
    quantity: z.coerce.number().int().min(1, 'Minimum 1'),
    batchNo: z.string().min(1, 'Batch number is required'),
  })).min(1, 'At least one line is required'),
});

const normalizePoStatus = (status) => {
  const raw = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!raw) return '';
  if (raw === 'OPEN' || raw === 'NEW') return 'PENDING';
  if (raw.includes('PARTIAL')) return 'PARTIAL';
  if (raw === 'RECEIVED') return 'RECEIVED';
  if (raw === 'PENDING') return 'PENDING';
  return raw;
};

async function exportPOs(pos) {
  await exportWmsWorkbook({
    fileName: `purchase_orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Purchase Orders',
    title: 'WMS Purchase Orders Export',
    columns: [
      { header: 'PO Number', key: 'poNumber', width: 16 },
      { header: 'Supplier', key: 'supplier', width: 24 },
      { header: 'Status', key: 'status', width: 14, align: 'center' },
      { header: 'Line Count', key: 'lineCount', width: 14, align: 'right' },
      { header: 'Created At', key: 'createdAt', width: 18, align: 'center' },
    ],
    rows: pos.map((p) => ({
      poNumber: p.poNumber,
      supplier: p.supplier ?? '',
      status: p.status ?? '',
      lineCount: p.lineCount ?? p.lines?.length ?? 0,
      createdAt: p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy') : '',
    })),
  });
  toast.success('Purchase orders exported to Excel');
}

export default function InboundPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [grnResult, setGrnResult] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPoId, setSelectedPoId] = useState('');


  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data ?? []),
    staleTime: 30_000,
    retry: false,
  });

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(receiveSchema),
    defaultValues: { poId: '', lines: [{ skuCode: '', quantity: 1, batchNo: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const receiveMutation = useMutation({
    mutationFn: (payload) => api.post('/inbound/receive', payload),
    onSuccess: async ({ data }) => {
      setGrnResult(data.grnNo);
      toast.success(`GRN ${data.grnNo} created successfully`);
      await queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      await queryClient.refetchQueries({ queryKey: ['purchaseOrders'], type: 'active' });
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to receive PO'),
  });

  const selectablePOs = useMemo(
    () => (purchaseOrders ?? []).filter((p) => normalizePoStatus(p.status) !== 'RECEIVED'),
    [purchaseOrders]
  );

  const { data: selectedPO, isLoading: selectedPoLoading } = useQuery({
    queryKey: ['purchaseOrderDetail', selectedPoId],
    queryFn: () => api.get(`/purchase-orders/${selectedPoId}`).then((r) => r.data),
    enabled: open && !!selectedPoId,
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (!selectedPO) return;
    const lines = (selectedPO.lines ?? []).map((line) => ({
      skuCode: line.skuCode,
      quantity: line.orderedQuantity ?? 1,
      batchNo: '',
    }));
    reset({
      poId: selectedPO.id,
      lines: lines.length ? lines : [{ skuCode: '', quantity: 1, batchNo: '' }],
    });
  }, [selectedPO, reset]);

  const filteredPOs = useMemo(() => {
    let list = purchaseOrders ?? [];
    if (statusFilter !== 'ALL') {
      list = list.filter((p) => normalizePoStatus(p.status) === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => String(p.poNumber ?? '').toLowerCase().includes(q) || String(p.supplier ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [purchaseOrders, statusFilter, search]);

  const stats = useMemo(() => {
    const pos = purchaseOrders ?? [];
    return {
      total:    pos.length,
      pending:  pos.filter((p) => normalizePoStatus(p.status) === 'PENDING').length,
      received: pos.filter((p) => normalizePoStatus(p.status) === 'RECEIVED').length,
      partial:  pos.filter((p) => normalizePoStatus(p.status) === 'PARTIAL').length,
    };
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbound"
        description="Manage purchase orders and receive goods into the warehouse."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportPOs(purchaseOrders ?? [])}>
              <Download className="size-3.5 mr-1.5" /> Export Excel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const firstPo = selectablePOs[0];
                const firstPoId = firstPo ? String(firstPo.id) : '';
                setSelectedPoId(firstPoId);
                setGrnResult(null);
                reset({ poId: firstPoId ? Number(firstPoId) : '', lines: [{ skuCode: '', quantity: 1, batchNo: '' }] });
                setOpen(true);
              }}
            >
              <Plus className="size-3.5 mr-1.5" /> Receive PO
            </Button>
          </div>
        }
      />

      {/* Receive PO Sheet */}
      <SlideOverForm
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setGrnResult(null);
            setSelectedPoId('');
            reset();
          }
        }}
        title="Receive Purchase Order"
        description="Enter the PO ID and items being received. A GRN will be created."
      >
                {grnResult ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="size-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <ClipboardList className="size-7 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">GRN Created</p>
                      <p className="text-muted-foreground text-sm mt-1">GRN Number: <span className="font-mono font-bold text-foreground">{grnResult}</span></p>
                    </div>
                    <Button onClick={() => { setGrnResult(null); reset(); }} variant="outline" className="w-full">Receive Another PO</Button>
                    <Button onClick={() => setOpen(false)} className="w-full">Done</Button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit((d) => {
                      const poId = Number(selectedPoId || d.poId);
                      if (!poId) {
                        toast.error('Please select a purchase order');
                        return;
                      }
                      receiveMutation.mutate({ ...d, poId });
                    })}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="poId">PO ID</Label>
                      <Select
                        value={selectedPoId}
                        onValueChange={(v) => {
                          setSelectedPoId(v);
                          setValue('poId', Number(v));
                        }}
                      >
                        <SelectTrigger id="poId" className="h-10">
                          <SelectValue placeholder="Select PO" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectablePOs.map((po) => (
                            <SelectItem key={po.id} value={String(po.id)}>
                              {po.poNumber} - {po.supplier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">PO lines auto-load after selection. Only non-received POs are listed.</p>
                      {errors.poId && <p className="text-xs text-destructive">{errors.poId.message}</p>}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Lines</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => append({ skuCode: '', quantity: 1, batchNo: '' })}>
                          <Plus className="size-3.5 mr-1" /> Add Line
                        </Button>
                      </div>
                      {fields.map((field, i) => (
                        <div key={field.id} className="rounded-xl border border-border/60 p-3 space-y-2.5 relative">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">SKU Code</Label>
                              <Input
                                placeholder="e.g. SKU-001"
                                className="h-8 text-sm"
                                readOnly={!!selectedPO?.lines?.length}
                                {...register(`lines.${i}.skuCode`)}
                              />
                              {errors.lines?.[i]?.skuCode && <p className="text-[10px] text-destructive">{errors.lines[i].skuCode.message}</p>}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Quantity</Label>
                              <Input type="number" min={1} className="h-8 text-sm" {...register(`lines.${i}.quantity`)} />
                              {errors.lines?.[i]?.quantity && <p className="text-[10px] text-destructive">{errors.lines[i].quantity.message}</p>}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Batch Number</Label>
                            <Input placeholder="BATCH-2026-001" className="h-8 text-sm font-mono" {...register(`lines.${i}.batchNo`)} />
                            {errors.lines?.[i]?.batchNo && <p className="text-[10px] text-destructive">{errors.lines[i].batchNo.message}</p>}
                          </div>
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                      <SheetFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={receiveMutation.isPending || selectedPoLoading || !selectedPoId}>
                        {receiveMutation.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
                        Receive Goods
                      </Button>
                      </SheetFooter>
                  </form>
                )}
      </SlideOverForm>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="Total POs"     value={stats.total}    icon={Package} kpiVariant="blue"   accentClass="text-blue-500"   iconBg="bg-blue-500/10" />
        <StatCard title="Pending"       value={stats.pending}  icon={Package} kpiVariant="amber"  accentClass="text-amber-500"  iconBg="bg-amber-500/10" />
        <StatCard title="Received"      value={stats.received} icon={Package} kpiVariant="green"  accentClass="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard title="Partial"       value={stats.partial}  icon={Package} kpiVariant="rose"   accentClass="text-rose-500"   iconBg="bg-rose-500/10" />
      </div>

      {/* Filter bar + table */}
      <div className="glass-card overflow-hidden rounded-[2rem]">
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-8 text-sm w-full sm:max-w-64" placeholder="Search PO number, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['ALL', 'PENDING', 'PARTIAL', 'RECEIVED'].map((s) => (
                <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || statusFilter !== 'ALL') && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(''); setStatusFilter('ALL'); }}>
              <X className="size-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filteredPOs.length ? (
              filteredPOs.map((po) => (
                <TableRow key={po.id} className="table-row-hover">
                  <TableCell className="font-bold font-mono text-primary">{po.poNumber}</TableCell>
                  <TableCell className="font-medium">{po.supplier || '—'}</TableCell>
                  <TableCell><StatusBadge status={normalizePoStatus(po.status)} /></TableCell>
                  <TableCell className="font-semibold">{po.lineCount ?? po.lines?.length ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {(po.createdAt || po.expectedArrivalDate)
                      ? format(new Date(po.createdAt || po.expectedArrivalDate), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {normalizePoStatus(po.status) !== 'RECEIVED' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                        const poId = String(po.id ?? '');
                        setSelectedPoId(poId);
                        setValue('poId', Number(poId));
                        reset({ poId: Number(poId), lines: [{ skuCode: '', quantity: 1, batchNo: '' }] });
                        setGrnResult(null);
                        setOpen(true);
                      }}>
                        <Package className="size-3 mr-1" /> Receive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                  <Package className="mx-auto mb-3 size-8 opacity-30" />
                  {search || statusFilter !== 'ALL' ? 'No POs match the current filter.' : 'No purchase orders available yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
