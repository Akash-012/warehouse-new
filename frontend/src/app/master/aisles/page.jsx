'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { CheckCircle2, Download, Pencil, Plus, Search, Trash2, X, Waypoints } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import SlideOverForm from '@/components/ui/SlideOverForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportWmsWorkbook } from '@/lib/exportExcel';

const schema = z.object({
  aisleNumber: z.string().min(1, 'Aisle number is required'),
  zoneId: z.coerce.number().int().positive('Zone is required'),
});

async function exportAislesExcel(items) {
  await exportWmsWorkbook({
    fileName: `aisles_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Aisles',
    title: 'WMS Aisle Master Export',
    columns: [
      { header: 'ID', key: 'id', width: 10, align: 'right' },
      { header: 'Aisle Number', key: 'aisleNumber', width: 18 },
      { header: 'Zone', key: 'zoneName', width: 22 },
      { header: 'Warehouse', key: 'warehouseName', width: 24 },
    ],
    rows: items.map((a) => ({
      id: a.id,
      aisleNumber: a.aisleNumber ?? '',
      zoneName: a.zone?.name ?? '',
      warehouseName: a.zone?.warehouse?.name ?? '',
    })),
  });
  toast.success('Aisles exported to Excel');
}

export default function AislesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  const { data: aisles = [], isLoading } = useQuery({
    queryKey: ['aisles'],
    queryFn: () => api.get('/master/aisles').then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.get('/master/zones').then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { aisleNumber: '', zoneId: undefined },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/master/aisles', payload),
    onSuccess: () => {
      toast.success('Aisle created.');
      queryClient.invalidateQueries({ queryKey: ['aisles'] });
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create aisle.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/master/aisles/${id}`, payload),
    onSuccess: () => {
      toast.success('Aisle updated.');
      queryClient.invalidateQueries({ queryKey: ['aisles'] });
      setOpen(false);
      setEditItem(null);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update aisle.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/master/aisles/${id}`),
    onSuccess: () => {
      toast.success('Aisle deleted.');
      queryClient.invalidateQueries({ queryKey: ['aisles'] });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Unable to delete aisle.'),
  });

  const onSubmit = (values) => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, payload: values });
      return;
    }
    createMutation.mutate(values);
  };

  const openCreate = () => {
    setEditItem(null);
    reset({ aisleNumber: '', zoneId: zones[0]?.id });
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    reset({ aisleNumber: item.aisleNumber ?? '', zoneId: item.zone?.id });
    setOpen(true);
  };

  const filtered = useMemo(() => {
    let list = aisles;
    if (zoneFilter !== 'ALL') {
      list = list.filter((a) => String(a.zone?.id ?? '') === zoneFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        String(a.aisleNumber ?? '').toLowerCase().includes(q) ||
        String(a.zone?.name ?? '').toLowerCase().includes(q) ||
        String(a.zone?.warehouse?.name ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
  }, [aisles, search, zoneFilter]);

  const showInitialLoading = isLoading && !(aisles?.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aisle Master"
        description="Create and manage aisles under zones for rack planning."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportAislesExcel(filtered)} disabled={!filtered.length}>
              <Download className="mr-1.5 size-3.5" /> Export Excel
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" /> Create Aisle
            </Button>
          </div>
        }
      />

      <SlideOverForm
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditItem(null);
            reset();
          }
        }}
        title={editItem ? 'Edit Aisle' : 'Create Aisle'}
        description="Aisles are used by racks and bins in storage structure."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="aisleNumber">Aisle Number</Label>
            <Input id="aisleNumber" placeholder="e.g. A-1" {...register('aisleNumber')} />
            {errors.aisleNumber ? <p className="text-xs text-destructive">{errors.aisleNumber.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zoneId">Zone</Label>
            <select id="zoneId" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('zoneId', { valueAsNumber: true })}>
              <option value="">Select zone</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            {errors.zoneId ? <p className="text-xs text-destructive">{errors.zoneId.message}</p> : null}
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditItem(null); reset(); }}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? <><CheckCircle2 className="mr-1.5 size-3.5" /> Save Changes</> : <><Plus className="mr-1.5 size-3.5" /> Create Aisle</>}
            </Button>
          </SheetFooter>
        </form>
      </SlideOverForm>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 pr-8" placeholder="Search aisle, zone, warehouse..." />
          {search ? (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          ) : null}
        </div>

        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
          <option value="ALL">All Zones</option>
          {zones.map((z) => <option key={z.id} value={String(z.id)}>{z.name}</option>)}
        </select>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {showInitialLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Waypoints className="size-12 opacity-30" />
            <p className="text-sm">{aisles.length ? 'No aisles match your filters.' : 'No aisles yet. Create your first aisle.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Aisle Number</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a, idx) => (
                <TableRow key={a.id} className="table-row-hover">
                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{a.aisleNumber}</TableCell>
                  <TableCell>{a.zone?.name ?? '-'}</TableCell>
                  <TableCell>{a.zone?.warehouse?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="mr-1 size-3.5" /> Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteMutation.mutate(a.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-1 size-3.5" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
