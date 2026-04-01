'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Search, X, Download, Building2, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import SlideOverForm from '@/components/ui/SlideOverForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SheetFooter } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { exportWmsWorkbook } from '@/lib/exportExcel';

const rackSchema = z.object({
  rackIdentifier: z.string().min(1, 'Rack code is required'),
  aisleId: z.coerce.number().int().positive('Aisle is required'),
});

async function exportRacksExcel(racks) {
  await exportWmsWorkbook({
    fileName: `racks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Racks',
    title: 'WMS Rack Master Export',
    columns: [
      { header: 'Rack ID', key: 'id', width: 10, align: 'right' },
      { header: 'Rack Identifier', key: 'rackIdentifier', width: 24 },
      { header: 'Aisle ID', key: 'aisleId', width: 10, align: 'right' },
      { header: 'Aisle Number', key: 'aisleNumber', width: 16 },
      { header: 'Zone', key: 'zoneName', width: 18 },
    ],
    rows: racks.map((r) => ({
      id: r.id,
      rackIdentifier: r.rackIdentifier ?? '',
      aisleId: r.aisle?.id ?? '',
      aisleNumber: r.aisle?.aisleNumber ?? '',
      zoneName: r.aisle?.zone?.name ?? '',
    })),
  });
  toast.success('Racks exported to Excel');
}

export default function RacksPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editRack, setEditRack] = useState(null);
  const [search, setSearch] = useState('');
  const [aisleFilter, setAisleFilter] = useState('ALL');

  const { data: racks, isLoading } = useQuery({
    queryKey: ['racks'],
    queryFn: () => api.get('/master/racks').then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const { data: aisles = [] } = useQuery({
    queryKey: ['aisles'],
    queryFn: () => api.get('/master/aisles').then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(rackSchema),
    defaultValues: { rackIdentifier: '', aisleId: undefined },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/master/racks', payload),
    onSuccess: () => {
      toast.success('Rack created successfully.');
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      reset();
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create rack.'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/master/racks/${id}`, payload),
    onSuccess: () => {
      toast.success('Rack updated.');
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      setEditRack(null);
      reset();
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update rack.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/master/racks/${id}`),
    onSuccess: () => {
      toast.success('Rack deleted.');
      queryClient.invalidateQueries({ queryKey: ['racks'] });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Unable to delete rack.'),
  });

  const onSubmit = (data) => {
    if (editRack) {
      editMutation.mutate({ id: editRack.id, payload: data });
      return;
    }
    createMutation.mutate(data);
  };

  const openCreate = () => {
    setEditRack(null);
    reset({ rackIdentifier: '', aisleId: aisles[0]?.id });
    setOpen(true);
  };

  const openEdit = (rack) => {
    setEditRack(rack);
    reset({ rackIdentifier: rack.rackIdentifier, aisleId: rack.aisle?.id });
    setOpen(true);
  };

  const filtered = useMemo(() => {
    let list = racks ?? [];
    if (aisleFilter !== 'ALL') {
      list = list.filter((r) => String(r.aisle?.id ?? '') === aisleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        String(r.rackIdentifier ?? '').toLowerCase().includes(q) ||
        String(r.aisle?.aisleNumber ?? '').toLowerCase().includes(q) ||
        String(r.aisle?.zone?.name ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
  }, [racks, search, aisleFilter]);

  const showInitialLoading = isLoading && !(racks?.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rack Master"
        description="Create and manage racks mapped to aisles for bin allocation."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportRacksExcel(filtered)} disabled={!filtered.length}>
              <Download className="mr-1.5 size-3.5" /> Export Excel
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" /> Create Rack
            </Button>
          </div>
        }
      />

      <SlideOverForm
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditRack(null);
            reset();
          }
        }}
        title={editRack ? 'Edit Rack' : 'Create Rack'}
        description="Rack code must be unique and linked to an aisle."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rackIdentifier">Rack Identifier</Label>
            <Input id="rackIdentifier" placeholder="e.g. A-01" {...register('rackIdentifier')} />
            {errors.rackIdentifier ? <p className="text-xs text-destructive">{errors.rackIdentifier.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aisleId">Aisle</Label>
            <select
              id="aisleId"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register('aisleId', { valueAsNumber: true })}
            >
              <option value="">Select aisle</option>
              {aisles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.aisleNumber} {a?.zone?.name ? `(${a.zone.name})` : ''}
                </option>
              ))}
            </select>
            {errors.aisleId ? <p className="text-xs text-destructive">{errors.aisleId.message}</p> : null}
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditRack(null); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || editMutation.isPending}>
              {editRack ? <><CheckCircle2 className="mr-1.5 size-3.5" /> Save Changes</> : <><Plus className="mr-1.5 size-3.5" /> Create Rack</>}
            </Button>
          </SheetFooter>
        </form>
      </SlideOverForm>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rack, aisle, zone..."
            className="h-9 pl-8 pr-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={aisleFilter}
          onChange={(e) => setAisleFilter(e.target.value)}
        >
          <option value="ALL">All Aisles</option>
          {aisles.map((a) => (
            <option key={a.id} value={String(a.id)}>{a.aisleNumber}</option>
          ))}
        </select>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {showInitialLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Building2 className="size-12 opacity-30" />
            <p className="text-sm">{racks?.length ? 'No racks match your filters.' : 'No racks yet. Create your first rack.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Rack Identifier</TableHead>
                <TableHead>Aisle</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rack, index) => (
                <TableRow key={rack.id} className="table-row-hover">
                  <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">{rack.rackIdentifier}</TableCell>
                  <TableCell>{rack.aisle?.aisleNumber ?? '-'}</TableCell>
                  <TableCell>{rack.aisle?.zone?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(rack)}>
                        <Pencil className="mr-1 size-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(rack.id)}
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

      {filtered.length > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">Showing {filtered.length} of {racks?.length ?? 0} racks</p>
      ) : null}
    </div>
  );
}
