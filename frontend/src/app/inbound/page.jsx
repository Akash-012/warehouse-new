'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { format } from 'date-fns';
import { Download, Loader2, Package, Plus, Search, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
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
import api from '@/lib/api';
import { toast } from 'sonner';

const receiveSchema = z.object({
  poId: z.string().min(1, 'PO ID is required'),
  lines: z.array(z.object({
    skuId: z.string().min(1, 'SKU is required'),
    quantity: z.coerce.number().int().min(1, 'Minimum 1'),
    batchNo: z.string().min(1, 'Batch number is required'),
  })).min(1, 'At least one line is required'),
});

function exportPOs(pos) {
  const BOM = '\uFEFF';
  const headers = ['PO Number', 'Supplier', 'Status', 'Lines', 'Created At'];
  const rows = pos.map((p) => [
    p.poNumber, p.supplier ?? '', p.status ?? '', p.lineCount ?? p.lines?.length ?? '',
    p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy') : '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `purchase_orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  toast.success('Purchase orders exported');
}

export default function InboundPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');


  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data ?? []),
    staleTime: 30_000,
    retry: false,
  });

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(receiveSchema),
    defaultValues: { poId: '', lines: [{ skuId: '', quantity: 1, batchNo: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const receiveMutation = useMutation({
    mutationFn: (payload) => api.post('/inbound/receive', payload),
    onSuccess: ({ data }) => {
      toast.success(`GRN ${data.grnNo} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to receive PO'),
  });

  const filteredPOs = useMemo(() => {
    let list = purchaseOrders ?? [];
    if (statusFilter !== 'ALL') list = list.filter((p) => p.status === statusFilter);
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
      pending:  pos.filter((p) => p.status === 'PENDING').length,
      received: pos.filter((p) => p.status === 'RECEIVED').length,
      partial:  pos.filter((p) => p.status === 'PARTIAL').length,
    };
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">

      {/* Stats row */}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filteredPOs.length ? (
              filteredPOs.map((po) => (
                <TableRow key={po.id} className="table-row-hover">
                  <TableCell className="font-bold font-mono text-primary">{po.poNumber}</TableCell>
                  <TableCell className="font-medium">{po.supplier || '—'}</TableCell>
                  <TableCell><StatusBadge status={po.status} /></TableCell>
                  <TableCell className="font-semibold">{po.lineCount ?? po.lines?.length ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {po.createdAt ? format(new Date(po.createdAt), 'dd MMM yyyy') : '—'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
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
