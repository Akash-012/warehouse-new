'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Truck, Plus, Search, Inbox, Link2, List, LayoutGrid } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

const createSchema = z.object({
  trolleyBarcode: z.string().min(1, 'Trolley barcode is required'),
  rackId: z.string().min(1, 'Rack is required'),
  compartmentCount: z.coerce.number().int().min(1, 'At least 1').max(20, 'Max 20'),
});

const assignSchema = z.object({
  compartmentBarcode: z.string().min(1, 'Required'),
  salesOrderId: z.coerce.number().int().positive('Order ID is required'),
});

const addCompartmentSchema = z.object({
  trolleyBarcode: z.string().min(1, 'Select a trolley'),
  rackId: z.string().min(1, 'Rack is required'),
  compartmentCount: z.coerce.number().int().min(1, 'At least 1').max(20, 'Max 20'),
  startSeq: z.coerce.number().int().min(1, 'Min 1'),
});

export default function TrolleysPage() {
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [compartmentContents, setCompartmentContents] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all trolleys for the list
  const { data: trolleyList, isLoading: listLoading } = useQuery({
    queryKey: ['trolleys-list'],
    queryFn: () => api.get('/trolleys').then((r) => r.data ?? []),
    staleTime: 15_000,
    retry: false,
  });

  // Fetch racks for compartment barcode generation
  const { data: racks } = useQuery({
    queryKey: ['racks-list'],
    queryFn: () => api.get('/master/racks').then((r) => r.data ?? []),
    staleTime: 60_000,
    retry: false,
  });

  // Build COMP-A1R1-01 barcode from rack + sequence
  const buildCompartmentBarcode = (rack, seq) => {
    const aisle = rack?.aisle?.aisleNumber ?? '';
    const rackPart = (rack?.rackIdentifier ?? '').replace('-', '');
    return `COMP-${aisle}${rackPart}-${String(seq).padStart(2, '0')}`;
  };

  // Preview generated barcodes
  const previewBarcodes = (rackId, count, startSeq = 1) => {
    const rack = (racks ?? []).find((r) => String(r.id) === String(rackId));
    if (!rack || !count) return [];
    return Array.from({ length: Number(count) }, (_, i) => buildCompartmentBarcode(rack, startSeq + i));
  };

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    control,
    reset: resetCreate,
    watch: watchCreate,
    formState: { errors: createErrors },
  } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { trolleyBarcode: '', rackId: '', compartmentCount: 1 },
  });

  const watchedRackId = watchCreate('rackId');
  const watchedCount = watchCreate('compartmentCount');
  const generatedBarcodes = previewBarcodes(watchedRackId, watchedCount);

  const {
    register: regAssign,
    handleSubmit: handleAssign,
    reset: resetAssign,
    formState: { errors: assignErrors },
  } = useForm({ resolver: zodResolver(assignSchema) });

  const {
    register: regAddComp,
    handleSubmit: handleAddComp,
    reset: resetAddComp,
    watch: watchAddComp,
    formState: { errors: addCompErrors },
  } = useForm({
    resolver: zodResolver(addCompartmentSchema),
    defaultValues: { trolleyBarcode: '', rackId: '', compartmentCount: 1, startSeq: 1 },
  });

  const watchedAddRackId = watchAddComp('rackId');
  const watchedAddCount = watchAddComp('compartmentCount');
  const watchedAddSeq = watchAddComp('startSeq');
  const addPreviewBarcodes = previewBarcodes(watchedAddRackId, watchedAddCount, Number(watchedAddSeq) || 1);

  const createMutation = useMutation({
    mutationFn: (data) => {
      const rack = (racks ?? []).find((r) => String(r.id) === String(data.rackId));
      const compartmentBarcodes = Array.from(
        { length: Number(data.compartmentCount) },
        (_, i) => buildCompartmentBarcode(rack, i + 1)
      );
      return api.post('/trolleys', {
        trolleyBarcode: data.trolleyBarcode,
        compartmentBarcodes,
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      toast.success(`Trolley ${data.trolleyIdentifier} created`);
      queryClient.invalidateQueries({ queryKey: ['trolleys-list'] });
      resetCreate();
    },
    onError: (e) => toast.error(e?.response?.data?.detail ?? 'Failed to create trolley'),
  });

  const assignMutation = useMutation({
    mutationFn: (data) => api.post('/trolleys/assign', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Compartment assigned to order');
      resetAssign();
    },
    onError: (e) => toast.error(e?.response?.data?.detail ?? 'Failed to assign compartment'),
  });

  const addCompartmentMutation = useMutation({
    mutationFn: ({ trolleyBarcode, compartmentBarcodes }) =>
      api.post(`/trolleys/${encodeURIComponent(trolleyBarcode)}/compartments`, { compartmentBarcodes }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`Added ${data.count} compartment(s) to ${data.trolleyBarcode}`);
      queryClient.invalidateQueries({ queryKey: ['trolleys-list'] });
      resetAddComp();
    },
    onError: (e) => toast.error(e?.response?.data?.detail ?? 'Failed to add compartments'),
  });

  const lookupMutation = useMutation({
    mutationFn: (barcode) =>
      api.get(`/trolleys/${barcode}/compartments`).then((r) => r.data),
    onSuccess: (data) => setCompartmentContents(data),
    onError: () => {
      setCompartmentContents([]);
      toast.error('No trolley found for that barcode');
    },
  });

  const handleLookup = (e) => {
    e.preventDefault();
    if (lookupBarcode) lookupMutation.mutate(lookupBarcode);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trolleys" description="Create trolleys, assign compartments to orders, and view contents." />
      {/* Trolley List */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <List className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">All Trolleys</h2>
          <Badge variant="outline" className="ml-auto">{trolleyList?.length ?? 0} trolleys</Badge>
        </div>
        {listLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (trolleyList?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Truck className="size-8 opacity-30" />
            <p className="text-sm">No trolleys yet — create one below</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-48 rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Barcode</TableHead>
                  <TableHead>Compartments</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trolleyList.map((t) => (
                  <TableRow key={t.id ?? t.barcode} className="table-row-hover">
                    <TableCell className="font-mono text-sm font-medium text-primary">{t.trolleyIdentifier}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(t.compartments ?? []).length === 0
                          ? <span className="text-muted-foreground text-xs">—</span>
                          : (t.compartments ?? []).map((b) => (
                              <span key={b} className="font-mono text-xs rounded-md bg-primary/10 text-primary px-2 py-0.5">{b}</span>
                            ))
                        }
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={t.status ?? 'IDLE'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create trolley */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Create Trolley
            </h2>
          </div>

          <form
            onSubmit={handleCreate((d) => createMutation.mutate(d))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Trolley Barcode</Label>
              <Input
                {...regCreate('trolleyBarcode')}
                placeholder="e.g. TRL-001"
                className="font-mono"
              />
              {createErrors.trolleyBarcode && (
                <p className="text-xs text-destructive">{createErrors.trolleyBarcode.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Rack</Label>
              <select
                {...regCreate('rackId')}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a rack…</option>
                {(racks ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {buildCompartmentBarcode(r, 1).replace(/-\d+$/, '')} — {r.rackIdentifier}
                  </option>
                ))}
              </select>
              {createErrors.rackId && (
                <p className="text-xs text-destructive">{createErrors.rackId.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Number of Compartments</Label>
              <Input
                type="number"
                min={1}
                max={20}
                {...regCreate('compartmentCount')}
                className="w-28"
              />
              {createErrors.compartmentCount && (
                <p className="text-xs text-destructive">{createErrors.compartmentCount.message}</p>
              )}
            </div>

            {generatedBarcodes.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Generated Compartments</p>
                <div className="flex flex-wrap gap-1.5">
                  {generatedBarcodes.map((b) => (
                    <span key={b} className="font-mono text-xs rounded-md bg-primary/10 text-primary px-2 py-0.5">{b}</span>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              Create Trolley
            </Button>
          </form>
        </div>

        {/* Add Compartment to existing trolley */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Add Compartment
            </h2>
          </div>

          <form
            onSubmit={handleAddComp((d) => {
              const rack = (racks ?? []).find((r) => String(r.id) === String(d.rackId));
              const compartmentBarcodes = Array.from(
                { length: Number(d.compartmentCount) },
                (_, i) => buildCompartmentBarcode(rack, Number(d.startSeq) + i)
              );
              addCompartmentMutation.mutate({ trolleyBarcode: d.trolleyBarcode, compartmentBarcodes });
            })}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Trolley</Label>
              <select
                {...regAddComp('trolleyBarcode')}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a trolley…</option>
                {(trolleyList ?? []).map((t) => (
                  <option key={t.id} value={t.trolleyIdentifier}>
                    {t.trolleyIdentifier}
                  </option>
                ))}
              </select>
              {addCompErrors.trolleyBarcode && (
                <p className="text-xs text-destructive">{addCompErrors.trolleyBarcode.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Rack</Label>
              <select
                {...regAddComp('rackId')}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a rack…</option>
                {(racks ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rackIdentifier}
                  </option>
                ))}
              </select>
              {addCompErrors.rackId && (
                <p className="text-xs text-destructive">{addCompErrors.rackId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Start Sequence</Label>
                <Input
                  type="number"
                  min={1}
                  {...regAddComp('startSeq')}
                  className="w-full"
                />
                {addCompErrors.startSeq && (
                  <p className="text-xs text-destructive">{addCompErrors.startSeq.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Count</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  {...regAddComp('compartmentCount')}
                  className="w-full"
                />
                {addCompErrors.compartmentCount && (
                  <p className="text-xs text-destructive">{addCompErrors.compartmentCount.message}</p>
                )}
              </div>
            </div>

            {addPreviewBarcodes.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
                <div className="flex flex-wrap gap-1.5">
                  {addPreviewBarcodes.map((b) => (
                    <span key={b} className="font-mono text-xs rounded-md bg-primary/10 text-primary px-2 py-0.5">{b}</span>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={addCompartmentMutation.isPending} className="w-full">
              <Plus className="size-4 mr-1" />
              Add Compartments
            </Button>
          </form>
        </div>

        {/* Assign + Lookup */}
        <div className="flex flex-col gap-6">
          {/* Assign compartment */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Assign to Order
              </h2>
            </div>
            <form
              onSubmit={handleAssign((d) => assignMutation.mutate(d))}
              className="flex flex-col gap-3"
            >
              <Input
                {...regAssign('compartmentBarcode')}
                placeholder="Compartment barcode"
                className="font-mono text-sm"
              />
              {assignErrors.compartmentBarcode && (
                <p className="text-xs text-destructive">
                  {assignErrors.compartmentBarcode.message}
                </p>
              )}
              <Input
                type="number"
                {...regAssign('salesOrderId')}
                placeholder="Sales Order ID"
              />
              {assignErrors.salesOrderId && (
                <p className="text-xs text-destructive">{assignErrors.salesOrderId.message}</p>
              )}
              <Button type="submit" disabled={assignMutation.isPending} className="w-full">
                Assign
              </Button>
            </form>
          </div>

          {/* View contents */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                View Contents
              </h2>
            </div>
            <form onSubmit={handleLookup} className="flex gap-2">
              <Input
                value={lookupBarcode}
                onChange={(e) => setLookupBarcode(e.target.value)}
                placeholder="Trolley barcode"
                className="font-mono flex-1"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={lookupMutation.isPending || !lookupBarcode}
              >
                <Search className="size-4" />
              </Button>
            </form>

            {compartmentContents === null ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                <Truck className="size-8 opacity-30" />
                <p className="text-xs">Enter a trolley barcode to view compartments</p>
              </div>
            ) : compartmentContents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <Inbox className="size-8 opacity-30" />
                <p className="text-xs">No compartments found</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Compartment</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compartmentContents.map((c) => (
                      <TableRow key={c.compartmentBarcode} className="table-row-hover">
                        <TableCell className="font-mono text-xs font-medium text-primary">{c.compartmentBarcode}</TableCell>
                        <TableCell>{c.salesOrderId ?? '—'}</TableCell>
                        <TableCell>{c.pickedItemBarcodes?.length ?? 0}</TableCell>
                        <TableCell><StatusBadge status={c.status ?? 'OPEN'} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
