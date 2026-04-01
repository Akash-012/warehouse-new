'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Plus, Package, Search, X, Download, Pencil, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { exportWmsWorkbook } from '@/lib/exportExcel';
import SlideOverForm from '@/components/ui/SlideOverForm';

const binSchema = z.object({
  rackId: z.coerce.number().int().positive('Rack is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  lengthCm: z.coerce.number().positive('Length is required'),
  widthCm: z.coerce.number().positive('Width is required'),
  heightCm: z.coerce.number().positive('Height is required'),
  maxWeightG: z.coerce.number().positive('Max weight is required'),
  status: z.enum(['AVAILABLE', 'FULL', 'BLOCKED']),
});

async function exportBinsExcel(bins) {
  await exportWmsWorkbook({
    fileName: `bins_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Bins',
    title: 'WMS Bin Master Export',
    columns: [
      { header: 'Barcode', key: 'barcode', width: 18 },
      { header: 'Status', key: 'status', width: 14, align: 'center' },
      { header: 'Utilization %', key: 'utilization', width: 14, align: 'right' },
      { header: 'Length (cm)', key: 'lengthCm', width: 12, align: 'right' },
      { header: 'Width (cm)', key: 'widthCm', width: 12, align: 'right' },
      { header: 'Height (cm)', key: 'heightCm', width: 12, align: 'right' },
      { header: 'Max Weight (g)', key: 'maxWeightG', width: 16, align: 'right' },
    ],
    rows: bins.map((b) => ({
      barcode: b.barcode,
      status: b.status ?? 'AVAILABLE',
      utilization: b.utilization ?? b.utilizationPct ?? 0,
      lengthCm: b.length_cm ?? b.lengthCm ?? '',
      widthCm: b.width_cm ?? b.widthCm ?? '',
      heightCm: b.height_cm ?? b.heightCm ?? '',
      maxWeightG: b.max_weight_g ?? b.maxWeightG ?? '',
    })),
  });
  toast.success('Bins exported to Excel');
}

const BinsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editBin, setEditBin] = useState(null);
  const [search, setSearch] = useState('');

  const { data: bins, isLoading } = useQuery({
    queryKey: ['bins'],
    queryFn: () => api.get('/master/bins').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: racks = [] } = useQuery({
    queryKey: ['racks'],
    queryFn: () => api.get('/master/racks').then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({ resolver: zodResolver(binSchema) });
  const [length, width, height] = useWatch({ control, name: ['lengthCm', 'widthCm', 'heightCm'] });
  const volume = (length || 0) * (width || 0) * (height || 0);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/master/bins', data),
    onSuccess: () => {
      toast.success('Bin created successfully.');
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      reset();
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to create bin.'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/master/bins/${id}`, data),
    onSuccess: () => {
      toast.success('Bin updated.');
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      setEditBin(null);
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update bin.'),
  });

  const onSubmit = (data) => {
    if (editBin) {
      editMutation.mutate({ id: editBin.id, data });
    } else {
      mutation.mutate(data);
    }
  };

  const openEdit = (bin) => {
    setEditBin(bin);
    reset({
      rackId: bin.rackId,
      barcode: bin.barcode,
      lengthCm: bin.lengthCm ?? bin.length_cm,
      widthCm: bin.widthCm ?? bin.width_cm,
      heightCm: bin.heightCm ?? bin.height_cm,
      maxWeightG: bin.maxWeightG ?? bin.max_weight_g,
      status: bin.status ?? 'AVAILABLE',
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditBin(null);
    reset({
      rackId: racks[0]?.id,
      barcode: '',
      lengthCm: undefined,
      widthCm: undefined,
      heightCm: undefined,
      maxWeightG: undefined,
      status: 'AVAILABLE',
    });
    setOpen(true);
  };

  const filtered = useMemo(() => {
    let list = bins ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = (bins ?? []).filter(
        (b) =>
          b.barcode.toLowerCase().includes(q) ||
          (b.status ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
  }, [bins, search]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <div className="glass-card rounded-2xl p-6 space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bin Master"
        description="Manage warehouse bin locations and dimensions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportBinsExcel(bins ?? [])} disabled={!bins?.length}>
              <Download className="mr-1.5 size-3.5" /> Export Excel
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" /> Create Bin
            </Button>
          </div>
        }
      />

      <SlideOverForm
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) { setEditBin(null); reset(); } }}
        title={editBin ? 'Edit Bin' : 'Create Bin'}
      >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rackId">Rack</Label>
              <select
                id="rackId"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...register('rackId', { valueAsNumber: true })}
              >
                <option value="">Select rack</option>
                {racks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.rackIdentifier ?? `Rack ${rack.id}`}
                  </option>
                ))}
              </select>
              {errors.rackId ? <p className="text-xs text-destructive">{errors.rackId.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="barcode">Barcode / Location Code</Label>
              <Input id="barcode" {...register('barcode')} placeholder="e.g. A-01-01" />
              {errors.barcode ? <p className="text-xs text-destructive">{errors.barcode.message}</p> : null}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Length (cm)</Label>
                <Input type="number" step="0.1" {...register('lengthCm', { valueAsNumber: true })} placeholder="100" />
                {errors.lengthCm ? <p className="text-xs text-destructive">{errors.lengthCm.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Width (cm)</Label>
                <Input type="number" step="0.1" {...register('widthCm', { valueAsNumber: true })} placeholder="60" />
                {errors.widthCm ? <p className="text-xs text-destructive">{errors.widthCm.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input type="number" step="0.1" {...register('heightCm', { valueAsNumber: true })} placeholder="50" />
                {errors.heightCm ? <p className="text-xs text-destructive">{errors.heightCm.message}</p> : null}
              </div>
            </div>
            {volume > 0 && (
              <p className="text-xs text-muted-foreground">
                Volume: <span className="font-medium text-foreground">{volume.toLocaleString()} cm³</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Max Weight (g)</Label>
              <Input type="number" {...register('maxWeightG', { valueAsNumber: true })} placeholder="50000" />
              {errors.maxWeightG ? <p className="text-xs text-destructive">{errors.maxWeightG.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...register('status')}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="FULL">FULL</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditBin(null); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending || editMutation.isPending}>
                {editBin ? <><CheckCircle2 className="mr-1.5 size-3.5" /> Save Changes</> : <><Plus className="mr-1.5 size-3.5" /> Create Bin</>}
              </Button>
            </SheetFooter>
          </form>
      </SlideOverForm>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by barcode or status..."
          className="pl-8 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="size-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {!filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Package className="size-12 opacity-30" />
            <p className="text-sm">{bins?.length ? 'No bins match the search.' : 'No bins yet - create your first bin'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Dimensions (cm)</TableHead>
                <TableHead>Max Weight</TableHead>
                <TableHead className="min-w-44">Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bin, idx) => (
                <TableRow key={bin.id} className="table-row-hover">
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{bin.barcode}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {(bin.lengthCm ?? bin.length_cm) && (bin.widthCm ?? bin.width_cm) && (bin.heightCm ?? bin.height_cm)
                      ? `${bin.lengthCm ?? bin.length_cm} x ${bin.widthCm ?? bin.width_cm} x ${bin.heightCm ?? bin.height_cm}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(bin.maxWeightG ?? bin.max_weight_g) ? `${((bin.maxWeightG ?? bin.max_weight_g) / 1000).toFixed(1)} kg` : '-'}
                  </TableCell>
                  <TableCell className="min-w-44">
                    <div className="flex items-center gap-2">
                      <Progress value={bin.utilization ?? 0} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                        {bin.utilization ?? 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={bin.status ?? 'AVAILABLE'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(bin)}>
                      <Pencil className="size-3.5 mr-1" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          Showing {filtered.length} of {bins?.length ?? 0} bins
        </p>
      )}
    </div>
  );
};

export default BinsPage;
