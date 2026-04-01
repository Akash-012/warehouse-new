'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { Building2, CheckCircle2, Download, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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
  name: z.string().min(1, 'Warehouse name is required'),
  location: z.string().min(1, 'Location is required'),
});

async function exportWarehousesExcel(items) {
  await exportWmsWorkbook({
    fileName: `warehouses_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Warehouses',
    title: 'WMS Warehouse Master Export',
    columns: [
      { header: 'ID', key: 'id', width: 10, align: 'right' },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Location', key: 'location', width: 34 },
    ],
    rows: items.map((w) => ({ id: w.id, name: w.name ?? '', location: w.location ?? '' })),
  });
  toast.success('Warehouses exported to Excel');
}

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/master/warehouses').then((r) => r.data ?? []),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', location: '' },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/master/warehouses', payload),
    onSuccess: async () => {
      toast.success('Warehouse created.');
      await queryClient.invalidateQueries({ queryKey: ['warehouses'], refetchType: 'active' });
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create warehouse.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/master/warehouses/${id}`, payload),
    onSuccess: async () => {
      toast.success('Warehouse updated.');
      await queryClient.invalidateQueries({ queryKey: ['warehouses'], refetchType: 'active' });
      setOpen(false);
      setEditItem(null);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update warehouse.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/master/warehouses/${id}`),
    onSuccess: async () => {
      toast.success('Warehouse deleted.');
      await queryClient.invalidateQueries({ queryKey: ['warehouses'], refetchType: 'active' });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Unable to delete warehouse.'),
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
    reset({ name: '', location: '' });
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    reset({ name: item.name ?? '', location: item.location ?? '' });
    setOpen(true);
  };

  const filtered = useMemo(() => {
    let list = warehouses;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = warehouses.filter((w) =>
        String(w.name ?? '').toLowerCase().includes(q) ||
        String(w.location ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
  }, [warehouses, search]);

  const showInitialLoading = isLoading && !(warehouses?.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Warehouse Master"
        description="Manage warehouse locations used by zones and aisle hierarchy."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportWarehousesExcel(filtered)} disabled={!filtered.length}>
              <Download className="mr-1.5 size-3.5" /> Export Excel
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" /> Create Warehouse
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
        title={editItem ? 'Edit Warehouse' : 'Create Warehouse'}
        description="Use a clear warehouse name and physical location for operations."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Warehouse Name</Label>
            <Input id="name" placeholder="e.g. Main DC" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g. Mumbai - Bhiwandi" {...register('location')} />
            {errors.location ? <p className="text-xs text-destructive">{errors.location.message}</p> : null}
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditItem(null); reset(); }}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? <><CheckCircle2 className="mr-1.5 size-3.5" /> Save Changes</> : <><Plus className="mr-1.5 size-3.5" /> Create Warehouse</>}
            </Button>
          </SheetFooter>
        </form>
      </SlideOverForm>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search warehouse or location..."
          className="h-9 pl-8 pr-8"
        />
        {search ? (
          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
            <X className="size-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        ) : null}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {showInitialLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Building2 className="size-12 opacity-30" />
            <p className="text-sm">{warehouses.length ? 'No warehouses match the search.' : 'No warehouses yet. Create your first warehouse.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w, idx) => (
                <TableRow key={w.id} className="table-row-hover">
                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.location}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(w)}><Pencil className="mr-1 size-3.5" /> Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteMutation.mutate(w.id)}
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
