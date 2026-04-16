'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { format } from 'date-fns';
import { Download, Loader2, Package, Plus, Search, Trash2, X, ClipboardList, FilePlus, Pencil } from 'lucide-react';
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
  priority: z.enum(['P1', 'P2', 'P3']).optional(),
  lines: z.array(z.object({
    skuCode: z.string().min(1, 'SKU code is required'),
    quantity: z.coerce.number().int().min(1, 'Minimum 1'),
    batchNo: z.string().min(1, 'Batch number is required'),
  })).min(1, 'At least one line is required'),
});

const createPoSchema = z.object({
  warehouseId: z.coerce.number().int().positive('Warehouse is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  expectedArrivalDate: z.string().optional(),
  lines: z.array(z.object({
    skuId: z.coerce.number().int().positive('SKU ID is required'),
    skuName: z.string().optional(),
    quantity: z.coerce.number().int().min(1, 'Minimum 1'),
    unitPrice: z.coerce.number().min(0, 'Must be ≥ 0').optional(),
    sgstRate: z.coerce.number().min(0).max(100).optional(),
    cgstRate: z.coerce.number().min(0).max(100).optional(),
  })).min(1, 'At least one product is required'),
});

// Safely parse date strings including "yyyy-MM-dd HH:mm:ss" format
const parseDate = (val) => {
  if (!val) return null;
  const iso = String(val).replace(' ', 'T');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

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
      createdAt: p.createdAt ? format(parseDate(p.createdAt), 'dd MMM yyyy') : '',
    })),
  });
  toast.success('Purchase orders exported to Excel');
}

export default function InboundPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [editPoOpen, setEditPoOpen] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
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
    defaultValues: { poId: '', priority: undefined, lines: [{ skuCode: '', quantity: 1, batchNo: '' }] },
  });

  const receivePriority = useWatch({ control, name: 'priority', defaultValue: undefined });

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

  const {
    register: registerPo,
    control: controlPo,
    handleSubmit: handleSubmitPo,
    reset: resetPo,
    setValue: setPoValue,
    formState: { errors: errorsPo },
  } = useForm({
    resolver: zodResolver(createPoSchema),
    defaultValues: { warehouseId: '', supplier: '', expectedArrivalDate: '', lines: [{ skuId: '', skuName: '', quantity: 1, unitPrice: '', sgstRate: '', cgstRate: '' }] },
  });

  const { fields: poLines, append: appendPoLine, remove: removePoLine } = useFieldArray({ control: controlPo, name: 'lines' });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/master/warehouses').then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const { data: skus } = useQuery({
    queryKey: ['skus'],
    queryFn: () => api.get('/master/skus').then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const createPoMutation = useMutation({
    mutationFn: (payload) => api.post('/purchase-orders', payload),
    onSuccess: async ({ data }) => {
      toast.success(`PO ${data.poNumber} created successfully`);
      await queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setCreatePoOpen(false);
      resetPo();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create PO'),
  });

  const editPoSchema = z.object({
    supplier: z.string().min(1, 'Supplier is required'),
    expectedArrivalDate: z.string().optional(),
    priority: z.enum(['P1', 'P2', 'P3']),
    lines: z.array(z.object({
      id: z.number().optional(),
      skuId: z.coerce.number().int().positive('SKU ID is required'),
      quantity: z.coerce.number().int().min(1, 'Minimum 1'),
      unitPrice: z.coerce.number().min(0).optional(),
      sgstRate: z.coerce.number().min(0).max(100).optional(),
      cgstRate: z.coerce.number().min(0).max(100).optional(),
    })).min(1, 'At least one product is required'),
  });

  const {
    register: registerEdit,
    control: controlEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: errorsEdit },
  } = useForm({
    resolver: zodResolver(editPoSchema),
    defaultValues: { supplier: '', expectedArrivalDate: '', priority: 'P2', lines: [] },
  });

  const { fields: editLines, append: appendEditLine, remove: removeEditLine } = useFieldArray({ control: controlEdit, name: 'lines' });
  const editPriority = useWatch({ control: controlEdit, name: 'priority', defaultValue: 'P2' });

  const editPoMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/purchase-orders/${id}`, payload),
    onSuccess: async ({ data }) => {
      toast.success(`PO ${data.poNumber} updated successfully`);
      await queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setEditPoOpen(false);
      setEditingPo(null);
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update PO'),
  });

  const openEditPo = async (po) => {
    // Fetch full PO detail to get lines with skuId
    let detail = po;
    try {
      const res = await api.get(`/purchase-orders/${po.id}`);
      detail = res.data;
    } catch {
      // fall back to list data
    }
    setEditingPo(detail);
    resetEdit({
      supplier: detail.supplier ?? '',
      expectedArrivalDate: detail.expectedArrivalDate ?? '',
      priority: detail.priority ?? 'P2',
      lines: (detail.lines ?? []).map((l) => ({ id: l.id, skuId: l.skuId, quantity: l.quantity, unitPrice: l.unitPrice ?? '', sgstRate: l.sgstRate ?? '', cgstRate: l.cgstRate ?? '' })),
    });
    setEditPoOpen(true);
  };

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
    const lines = (selectedPO.lines ?? []).map((line) => {
      const alreadyReceived = line.receivedQty ?? 0;
      const remaining = Math.max(1, (line.quantity ?? 1) - alreadyReceived);
      return {
        skuCode: line.skuCode,
        quantity: remaining,
        batchNo: '',
        _ordered: line.quantity,
        _alreadyReceived: alreadyReceived,
        _remaining: remaining,
      };
    });
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
              variant="outline"
              onClick={() => { resetPo(); setCreatePoOpen(true); }}
            >
              <FilePlus className="size-3.5 mr-1.5" /> Create PO
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

      {/* Create PO Sheet */}
      <SlideOverForm
        open={createPoOpen}
        onOpenChange={(v) => { setCreatePoOpen(v); if (!v) resetPo(); }}
        title="Create Purchase Order"
        description="Fill in the details below to create a new purchase order."
      >
        <form
          onSubmit={handleSubmitPo((d) => {
            const payload = {
              warehouseId: Number(d.warehouseId),
              supplier: d.supplier,
              expectedArrivalDate: d.expectedArrivalDate || undefined,
              lines: d.lines.map((l) => ({
                skuId: Number(l.skuId),
                quantity: Number(l.quantity),
                unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
                sgstRate: l.sgstRate ? Number(l.sgstRate) : undefined,
                cgstRate: l.cgstRate ? Number(l.cgstRate) : undefined,
              })),
            };
            createPoMutation.mutate(payload);
          })}
          className="space-y-4"
        >
          {/* Warehouse */}
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Select onValueChange={(v) => setPoValue('warehouseId', Number(v), { shouldValidate: true })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {(warehouses ?? []).map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name} {w.location ? `— ${w.location}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorsPo.warehouseId && <p className="text-xs text-destructive">{errorsPo.warehouseId.message}</p>}
          </div>

          {/* Supplier */}
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Input placeholder="e.g. Acme Corp" className="h-10" {...registerPo('supplier')} />
            {errorsPo.supplier && <p className="text-xs text-destructive">{errorsPo.supplier.message}</p>}
          </div>

          {/* Expected Arrival */}
          <div className="space-y-1.5">
            <Label>Expected Arrival Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input type="date" className="h-10" {...registerPo('expectedArrivalDate')} />
          </div>

          <Separator />

          {/* Product Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Products</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => appendPoLine({ skuId: '', skuName: '', quantity: 1, unitPrice: '', sgstRate: '', cgstRate: '' })}>
                <Plus className="size-3.5 mr-1" /> Add Product
              </Button>
            </div>
            {poLines.map((field, i) => (
              <div key={field.id} className="rounded-xl border border-border/60 p-3 space-y-2.5 relative">
                <p className="text-xs font-medium text-muted-foreground">Product {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">SKU ID</Label>
                    <Input type="number" min={1} placeholder="e.g. 3" className="h-8 text-sm" {...registerPo(`lines.${i}.skuId`)} />
                    {errorsPo.lines?.[i]?.skuId && <p className="text-[10px] text-destructive">{errorsPo.lines[i].skuId.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={1} className="h-8 text-sm" {...registerPo(`lines.${i}.quantity`)} />
                    {errorsPo.lines?.[i]?.quantity && <p className="text-[10px] text-destructive">{errorsPo.lines[i].quantity.message}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Product Name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input placeholder="e.g. Widget A" className="h-8 text-sm" {...registerPo(`lines.${i}.skuName`)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Price (₹)</Label>
                    <Input type="number" min={0} step="0.01" placeholder="0.00" className="h-8 text-sm" {...registerPo(`lines.${i}.unitPrice`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SGST %</Label>
                    <Input type="number" min={0} max={100} step="0.01" placeholder="9" className="h-8 text-sm" {...registerPo(`lines.${i}.sgstRate`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CGST %</Label>
                    <Input type="number" min={0} max={100} step="0.01" placeholder="9" className="h-8 text-sm" {...registerPo(`lines.${i}.cgstRate`)} />
                  </div>
                </div>
                {poLines.length > 1 && (
                  <button type="button" onClick={() => removePoLine(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {errorsPo.lines?.root && <p className="text-xs text-destructive">{errorsPo.lines.root.message}</p>}
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setCreatePoOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createPoMutation.isPending}>
              {createPoMutation.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
              Create PO
            </Button>
          </SheetFooter>
        </form>
      </SlideOverForm>

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
                      receiveMutation.mutate({ ...d, poId, priority: d.priority || undefined });
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
                    {/* Priority */}
                    <div className="space-y-1.5">
                      <Label>Priority <span className="text-muted-foreground text-xs">(optional — overrides PO priority)</span></Label>
                      <Select value={receivePriority ?? ''} onValueChange={(v) => setValue('priority', v || undefined, { shouldValidate: true })}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Keep existing priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="P1">P1 — High</SelectItem>
                          <SelectItem value="P2">P2 — Medium</SelectItem>
                          <SelectItem value="P3">P3 — Low</SelectItem>
                        </SelectContent>
                      </Select>
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
                          {field._ordered != null && (
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>Ordered: <strong className="text-foreground">{field._ordered}</strong></span>
                              <span>Received: <strong className="text-foreground">{field._alreadyReceived}</strong></span>
                              <span>Remaining: <strong className="text-orange-500">{field._remaining}</strong></span>
                            </div>
                          )}
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
                              <Label className="text-xs">Qty to Receive {field._remaining != null && <span className="text-muted-foreground">(max {field._remaining})</span>}</Label>
                              <Input
                                type="number"
                                min={1}
                                max={field._remaining ?? undefined}
                                className="h-8 text-sm"
                                {...register(`lines.${i}.quantity`)}
                              />
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

      {/* Edit PO Sheet — only for PENDING/OPEN POs */}
      <SlideOverForm
        open={editPoOpen}
        onOpenChange={(v) => { setEditPoOpen(v); if (!v) setEditingPo(null); }}
        title={`Edit PO — ${editingPo?.poNumber ?? ''}`}
        description="Only PENDING purchase orders can be edited. You can update quantities, add new lines, or change priority."
      >
        <form
          onSubmit={handleSubmitEdit((d) => {
            editPoMutation.mutate({
              id: editingPo.id,
              payload: {
                supplier: d.supplier,
                expectedArrivalDate: d.expectedArrivalDate || undefined,
                priority: d.priority,
                lines: d.lines.map((l) => ({
                  id: l.id || undefined,
                  skuId: Number(l.skuId),
                  quantity: Number(l.quantity),
                  unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
                  sgstRate: l.sgstRate ? Number(l.sgstRate) : undefined,
                  cgstRate: l.cgstRate ? Number(l.cgstRate) : undefined,
                })),
              },
            });
          })}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Input className="h-10" {...registerEdit('supplier')} />
            {errorsEdit.supplier && <p className="text-xs text-destructive">{errorsEdit.supplier.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Expected Arrival Date</Label>
            <Input type="date" className="h-10" {...registerEdit('expectedArrivalDate')} />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={editPriority}
              onValueChange={(v) => setEditValue('priority', v, { shouldValidate: true })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P1">P1 — High</SelectItem>
                <SelectItem value="P2">P2 — Medium</SelectItem>
                <SelectItem value="P3">P3 — Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Product Lines</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => appendEditLine({ skuId: '', quantity: 1, unitPrice: '', sgstRate: '', cgstRate: '' })}>
                <Plus className="size-3.5 mr-1" /> Add Line
              </Button>
            </div>
            {editLines.map((field, i) => (
              <div key={field.id} className="rounded-xl border border-border/60 p-3 space-y-2 relative">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">SKU ID</Label>
                    <Input type="number" min={1} className="h-8 text-sm" {...registerEdit(`lines.${i}.skuId`)} />
                    {errorsEdit.lines?.[i]?.skuId && <p className="text-[10px] text-destructive">{errorsEdit.lines[i].skuId.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={1} className="h-8 text-sm" {...registerEdit(`lines.${i}.quantity`)} />
                    {errorsEdit.lines?.[i]?.quantity && <p className="text-[10px] text-destructive">{errorsEdit.lines[i].quantity.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Price (₹)</Label>
                    <Input type="number" min={0} step="0.01" placeholder="0.00" className="h-8 text-sm" {...registerEdit(`lines.${i}.unitPrice`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SGST %</Label>
                    <Input type="number" min={0} max={100} step="0.01" placeholder="9" className="h-8 text-sm" {...registerEdit(`lines.${i}.sgstRate`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CGST %</Label>
                    <Input type="number" min={0} max={100} step="0.01" placeholder="9" className="h-8 text-sm" {...registerEdit(`lines.${i}.cgstRate`)} />
                  </div>
                </div>
                {editLines.length > 1 && (
                  <button type="button" onClick={() => removeEditLine(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setEditPoOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={editPoMutation.isPending}>
              {editPoMutation.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </form>
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
              <TableHead>Priority</TableHead>
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
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      po.priority === 'P1' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      po.priority === 'P3' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {po.priority ?? 'P2'}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={normalizePoStatus(po.status)} /></TableCell>
                  <TableCell className="font-semibold">{po.lineCount ?? po.lines?.length ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {(po.createdAt || po.expectedArrivalDate)
                      ? format(parseDate(po.createdAt || po.expectedArrivalDate), 'dd MMM yyyy HH:mm')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {['PENDING', 'OPEN'].includes(normalizePoStatus(po.status)) && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditPo(po)}>
                          <Pencil className="size-3 mr-1" /> Edit
                        </Button>
                      )}
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
                    </div>
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
