'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Download,
  Loader2,
  PackageSearch,
  Search,
  Warehouse,
  X,
  ListChecks,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanInput } from '@/components/ui/ScanInput';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { exportWmsWorkbook } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { format } from 'date-fns';

const putawaySchema = z.object({
  itemBarcode: z.string().min(1, 'Item barcode is required'),
  binBarcode: z.string().min(1, 'Bin barcode is required'),
});

const PRIORITY_CONFIG = {
  1: { label: 'P1 - High', cls: 'bg-rose-500/12 text-rose-600 ring-rose-500/20 dark:text-rose-400' },
  2: { label: 'P2 - Med',  cls: 'bg-amber-500/12 text-amber-600 ring-amber-500/20 dark:text-amber-400' },
  3: { label: 'P3 - Low',  cls: 'bg-slate-500/12 text-slate-600 ring-slate-500/20 dark:text-slate-400' },
};

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[3];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

async function exportTasksExcel(tasks) {
  await exportWmsWorkbook({
    fileName: `putaway_tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Putaway Tasks',
    title: 'WMS Putaway Tasks Export',
    columns: [
      { header: 'Priority', key: 'priority', width: 12, align: 'center' },
      { header: 'Item Barcode', key: 'itemBarcode', width: 24 },
      { header: 'Suggested Bin', key: 'suggestedBin', width: 18 },
      { header: 'SKU', key: 'skuCode', width: 16 },
      { header: 'SKU Name', key: 'skuName', width: 28 },
      { header: 'GRN No', key: 'grnNo', width: 18 },
      { header: 'PO Number', key: 'poNumber', width: 18 },
    ],
    rows: tasks.map((t) => ({
      priority: t.priority === 1 ? 'HIGH' : t.priority === 2 ? 'MEDIUM' : 'LOW',
      itemBarcode: t.itemBarcode ?? t.inventoryBarcode ?? '',
      suggestedBin: t.suggestedBinBarcode ?? t.suggestedBin ?? '',
      skuCode: t.skuCode ?? '',
      skuName: t.skuName ?? '',
      grnNo: t.grnNo ?? '',
      poNumber: t.poNumber ?? '',
    })),
  });
  toast.success('Putaway tasks exported to Excel');
}

export default function PutawayPage() {
  const queryClient = useQueryClient();
  const [lastExecution, setLastExecution] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['putawayTasks'],
    queryFn: () => api.get('/putaway/tasks/pending').then((r) => r.data ?? []),
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(putawaySchema) });

  const executeMutation = useMutation({
    mutationFn: (payload) => api.post('/putaway/execute', payload),
    onSuccess: ({ data }) => {
      setLastExecution(data);
      toast.success(`Item moved to ${data.binBarcode || 'target bin'}`);
      queryClient.invalidateQueries({ queryKey: ['putawayTasks'] });
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to execute putaway');
    },
  });

  const stats = useMemo(() => {
    const all = tasks ?? [];
    return {
      total:  all.length,
      high:   all.filter((t) => t.priority === 1).length,
      medium: all.filter((t) => t.priority === 2).length,
      low:    all.filter((t) => t.priority === 3).length,
    };
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    if (priorityFilter !== 'ALL') list = list.filter((t) => String(t.priority) === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.itemBarcode ?? t.inventoryBarcode ?? '').toLowerCase().includes(q) ||
          (t.suggestedBinBarcode ?? t.suggestedBin ?? '').toLowerCase().includes(q) ||
          (t.skuCode ?? '').toLowerCase().includes(q) ||
          (t.skuName ?? '').toLowerCase().includes(q) ||
          (t.grnNo ?? '').toLowerCase().includes(q) ||
          (t.poNumber ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [tasks, priorityFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Putaway"
        description="Assign received items to bin locations across the warehouse."
        actions={
          <Button size="sm" variant="outline" onClick={() => exportTasksExcel(tasks ?? [])} disabled={!tasks?.length}>
            <Download className="size-3.5 mr-1.5" /> Export Excel
          </Button>
        }
      />
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Pending Tasks"   value={stats.total}  icon={Warehouse}     kpiVariant="blue"  accentClass="text-blue-500"   iconBg="bg-blue-500/10" />
        <StatCard title="High Priority"   value={stats.high}   icon={AlertCircle}   kpiVariant="rose"  accentClass="text-rose-500"   iconBg="bg-rose-500/10" />
        <StatCard title="Medium Priority" value={stats.medium} icon={PackageSearch} kpiVariant="amber" accentClass="text-amber-500"  iconBg="bg-amber-500/10" />
        <StatCard title="Low Priority"    value={stats.low}    icon={ListChecks}    kpiVariant="blue"  accentClass="text-slate-500"  iconBg="bg-slate-500/10" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Tasks table */}
        <Card className="glass-card rounded-[2rem] py-5">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="size-4 text-primary" />
                  Pending putaway tasks
                </CardTitle>
                <CardDescription className="mt-1">
                  {filtered.length} task{filtered.length === 1 ? '' : 's'} shown
                  {filtered.length !== stats.total ? ` (${stats.total} total)` : ''}
                </CardDescription>
              </div>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search barcode or SKU..."
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {['ALL', '1', '2', '3'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      priorityFilter === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {p === 'ALL' ? 'All' : `P${p}`}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 px-0">
            <div className="thin-scrollbar max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Priority</TableHead>
                    <TableHead>Item Barcode</TableHead>
                    <TableHead>Suggested Bin</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>SKU Name</TableHead>
                    <TableHead className="pr-6">GRN / PO Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(4)].map((__, c) => (
                          <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.length ? (
                    filtered.map((task) => (
                      <TableRow key={task.id} className="table-row-hover">
                        <TableCell className="pl-6">
                          <PriorityBadge priority={task.priority} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {task.itemBarcode ?? task.inventoryBarcode ?? '—'}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-primary">
                          {task.suggestedBinBarcode ?? task.suggestedBin ?? '—'}
                        </TableCell>
                        <TableCell className="font-semibold">{task.skuCode ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{task.skuName ?? '—'}</TableCell>
                        <TableCell className="pr-6 text-xs text-muted-foreground font-mono">
                          {task.grnNo ? `GRN: ${task.grnNo}` : task.poNumber ? `PO: ${task.poNumber}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                        <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-500/70" />
                        {tasks?.length
                          ? 'No tasks match the current filter.'
                          : 'No pending putaway tasks.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Scan interface */}
        <Card className="glass-card rounded-[2rem] py-5">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="flex items-center gap-2">
              <PackageSearch className="size-4 text-primary" />
              Scan interface
            </CardTitle>
            <CardDescription>
              Scan the item first, then confirm the destination bin.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            <form
              onSubmit={handleSubmit((values) => executeMutation.mutate(values))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="itemBarcode">Item barcode</Label>
                <div className="relative">
                  <ScanInput
                    id="itemBarcode"
                    placeholder="Scan item barcode and press Enter…"
                    onScan={(val) => setValue('itemBarcode', val)}
                    onChange={(val) => setValue('itemBarcode', val)}
                    value={watch('itemBarcode') ?? ''}
                    clearAfterScan={false}
                    className="font-mono text-sm"
                  />
                </div>
                {errors.itemBarcode && (
                  <p className="text-xs text-destructive">{errors.itemBarcode.message}</p>
                )}
              </div>

              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="size-4" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="binBarcode">Bin barcode</Label>
                <div className="relative">
                  <ScanInput
                    id="binBarcode"
                    placeholder="Scan destination bin and press Enter…"
                    onScan={(val) => setValue('binBarcode', val)}
                    onChange={(val) => setValue('binBarcode', val)}
                    value={watch('binBarcode') ?? ''}
                    clearAfterScan={false}
                    className="font-mono text-sm"
                  />
                </div>
                {errors.binBarcode && (
                  <p className="text-xs text-destructive">{errors.binBarcode.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={executeMutation.isPending}
              >
                {executeMutation.isPending && (
                  <Loader2 className="size-4 animate-spin mr-2" />
                )}
                Execute Putaway
              </Button>
            </form>

            {lastExecution && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  Last execution succeeded
                </p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <p>
                    Bin:{' '}
                    <span className="font-mono text-foreground">
                      {lastExecution.binBarcode ?? ' - '}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span>Status:</span>
                    <StatusBadge status={lastExecution.newBinStatus} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
