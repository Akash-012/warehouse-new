'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Truck, Plus, Minus, Search, Inbox, Link2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

const createSchema = z.object({
  trolleyBarcode: z.string().min(1, 'Trolley barcode is required'),
  compartmentBarcodes: z
    .array(z.object({ value: z.string().min(1, 'Required') }))
    .min(1, 'At least one compartment required'),
});

const assignSchema = z.object({
  compartmentBarcode: z.string().min(1, 'Required'),
  salesOrderId: z.coerce.number().int().positive('Order ID is required'),
});

export default function TrolleysPage() {
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [compartmentContents, setCompartmentContents] = useState(null);

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    control,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { trolleyBarcode: '', compartmentBarcodes: [{ value: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'compartmentBarcodes' });

  const {
    register: regAssign,
    handleSubmit: handleAssign,
    reset: resetAssign,
    formState: { errors: assignErrors },
  } = useForm({ resolver: zodResolver(assignSchema) });

  const createMutation = useMutation({
    mutationFn: (data) =>
      api
        .post('/trolleys', {
          trolleyBarcode: data.trolleyBarcode,
          compartmentBarcodes: data.compartmentBarcodes.map((c) => c.value),
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`Trolley ${data.barcode ?? data.trolleyBarcode} created`);
      resetCreate();
    },
    onError: () => toast.error('Failed to create trolley'),
  });

  const assignMutation = useMutation({
    mutationFn: (data) => api.post('/trolleys/assign', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Compartment assigned to order');
      resetAssign();
    },
    onError: () => toast.error('Failed to assign compartment'),
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
      <PageHeader
        title="Trolleys"
        description="Create trolleys, assign compartments to orders, and view contents."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              <Label>Compartment Barcodes</Label>
              {fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...regCreate(`compartmentBarcodes.${idx}.value`)}
                    placeholder={`Compartment ${idx + 1}`}
                    className="font-mono flex-1"
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(idx)}
                    >
                      <Minus className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: '' })}
                className="self-start"
              >
                <Plus className="size-3.5 mr-1.5" />
                Add Compartment
              </Button>
            </div>

            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              Create Trolley
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
                        <TableCell>{c.salesOrderId ?? 'Ã¢â‚¬â€'}</TableCell>
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
