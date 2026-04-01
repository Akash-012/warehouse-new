'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { Blocks, CheckCircle2, Download, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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
  name: z.string().min(1, 'Zone name is required'),
  warehouseId: z.coerce.number().int().positive('Warehouse is required'),
});

async function exportZonesExcel(items) {
  await exportWmsWorkbook({
    fileName: `zones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Zones',
    title: 'WMS Zone Master Export',
    columns: [
      { header: 'ID', key: 'id', width: 10, align: 'right' },
      { header: 'Zone Name', key: 'name', width: 24 },
      { header: 'Warehouse', key: 'warehouse', width: 28 },
      { header: 'Warehouse Location', key: 'location', width: 30 },
    ],
    rows: items.map((z) => ({
      id: z.id,
      name: z.name ?? '',
      warehouse: z.warehouse?.name ?? '',
      location: z.warehouse?.location ?? '',
    })),
  });
  toast.success('Zones exported to Excel');
}

export default function ZonesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.get('/master/zones').then((r) => r.data ?? []),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/master/warehouses').then((r) => r.data ?? []),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', warehouseId: undefined },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/master/zones', payload),
    onSuccess: async () => {
      toast.success('Zone created.');
      await queryClient.invalidateQueries({ queryKey: ['zones'], refetchType: 'active' });
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create zone.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/master/zones/${id}`, payload),
    onSuccess: async () => {
      toast.success('Zone updated.');
      await queryClient.invalidateQueries({ queryKey: ['zones'], refetchType: 'active' });
      setOpen(false);
      setEditItem(null);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update zone.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/master/zones/${id}`),
    onSuccess: async () => {
      toast.success('Zone deleted.');
      await queryClient.invalidateQueries({ queryKey: ['zones'], refetchType: 'active' });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Unable to delete zone.'),
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
    reset({ name: '', warehouseId: warehouses[0]?.id });
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    reset({ name: item.name ?? '', warehouseId: item.warehouse?.id });
    setOpen(true);
  };

  const filtered = useMemo(() => {
    let list = zones;
    if (warehouseFilter !== 'ALL') {
      list = list.filter((z) => String(z.warehouse?.id ?? '') === warehouseFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((z) =>
        String(z.name ?? '').toLowerCase().includes(q) ||
        String(z.warehouse?.name ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
  }, [zones, search, warehouseFilter]);

  const showInitialLoading = isLoading && !(zones?.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Zone Master"
        description="Manage zones grouped under warehouses for aisle planning."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportZonesExcel(filtered)} disabled={!filtered.length}>
              <Download className="mr-1.5 size-3.5" /> Export Excel
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" /> Create Zone
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
        title={editItem ? 'Edit Zone' : 'Create Zone'}
        description="Zones are subdivisions inside a warehouse."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Zone Name</Label>
            <Input id="name" placeholder="e.g. Ambient" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouseId">Warehouse</Label>
            <select id="warehouseId" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('warehouseId', { valueAsNumber: true })}>
              <option value="">Select warehouse</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {errors.warehouseId ? <p className="text-xs text-destructive">{errors.warehouseId.message}</p> : null}
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditItem(null); reset(); }}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? <><CheckCircle2 className="mr-1.5 size-3.5" /> Save Changes</> : <><Plus className="mr-1.5 size-3.5" /> Create Zone</>}
            </Button>
          </SheetFooter>
        </form>
      </SlideOverForm>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 pr-8" placeholder="Search zone or warehouse..." />
          {search ? (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          ) : null}
        </div>

        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          <option value="ALL">All Warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
        </select>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {showInitialLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Blocks className="size-12 opacity-30" />
            <p className="text-sm">{zones.length ? 'No zones match your filters.' : 'No zones yet. Create your first zone.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((z, idx) => (
                <TableRow key={z.id} className="table-row-hover">
                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{z.name}</TableCell>
                  <TableCell>{z.warehouse?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(z)}><Pencil className="mr-1 size-3.5" /> Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteMutation.mutate(z.id)}
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
