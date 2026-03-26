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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Plus, Package, Search, X, Download, Pencil, CheckCircle2 } from 'lucide-react';

const binSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  length_cm: z.number().positive(),
  width_cm: z.number().positive(),
  height_cm: z.number().positive(),
  max_weight_g: z.number().positive(),
});

function exportBinsCSV(bins) {
  const BOM = '\uFEFF';
  const header = 'Barcode,Status,Utilization %,L (cm),W (cm),H (cm),Max Weight (g)\n';
  const rows = bins
    .map((b) =>
      [
        b.barcode,
        b.status ?? 'AVAILABLE',
        b.utilization ?? 0,
        b.length_cm ?? '',
        b.width_cm ?? '',
        b.height_cm ?? '',
        b.max_weight_g ?? '',
      ].join(','),
    )
    .join('\n');
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bins_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast.success('Bins exported');
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

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({ resolver: zodResolver(binSchema) });
  const [length, width, height] = useWatch({ control, name: ['length_cm', 'width_cm', 'height_cm'] });
  const volume = (length || 0) * (width || 0) * (height || 0);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/master/bins', data),
    onSuccess: () => {
      toast.success('Bin created successfully.');
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      reset();
      setOpen(false);
    },
    onError: () => toast.error('Failed to create bin.'),
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
    onError: () => toast.error('Failed to update bin.'),
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
      barcode: bin.barcode,
      length_cm: bin.length_cm,
      width_cm: bin.width_cm,
      height_cm: bin.height_cm,
      max_weight_g: bin.max_weight_g,
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditBin(null);
    reset({ barcode: '', length_cm: undefined, width_cm: undefined, height_cm: undefined, max_weight_g: undefined });
    setOpen(true);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return bins ?? [];
    const q = search.toLowerCase();
    return (bins ?? []).filter(
      (b) =>
        b.barcode.toLowerCase().includes(q) ||
        (b.status ?? '').toLowerCase().includes(q),
    );
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportBinsCSV(bins ?? [])} disabled={!bins?.length}>
              <Download className="mr-1.5 size-3.5" /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" /> Create Bin
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditBin(null); reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editBin ? 'Edit Bin' : 'Create Bin'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="barcode">Barcode / Location Code</Label>
              <Input id="barcode" {...register('barcode')} placeholder="e.g. A-01-01" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Length (cm)</Label>
                <Input type="number" step="0.1" {...register('length_cm', { valueAsNumber: true })} placeholder="100" />
              </div>
              <div className="space-y-1.5">
                <Label>Width (cm)</Label>
                <Input type="number" step="0.1" {...register('width_cm', { valueAsNumber: true })} placeholder="60" />
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input type="number" step="0.1" {...register('height_cm', { valueAsNumber: true })} placeholder="50" />
              </div>
            </div>
            {volume > 0 && (
              <p className="text-xs text-muted-foreground">
                Volume: <span className="font-medium text-foreground">{volume.toLocaleString()} cm³</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Max Weight (g)</Label>
              <Input type="number" {...register('max_weight_g', { valueAsNumber: true })} placeholder="50000" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditBin(null); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending || editMutation.isPending}>
                {editBin ? <><CheckCircle2 className="mr-1.5 size-3.5" /> Save Changes</> : <><Plus className="mr-1.5 size-3.5" /> Create Bin</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                    {bin.length_cm && bin.width_cm && bin.height_cm
                      ? `${bin.length_cm} x ${bin.width_cm} x ${bin.height_cm}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {bin.max_weight_g ? `${(bin.max_weight_g / 1000).toFixed(1)} kg` : '-'}
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
