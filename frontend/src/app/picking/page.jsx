'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { usePickingSession } from '@/lib/hooks/usePickingSession';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanInput } from '@/components/ui/ScanInput';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { exportWmsWorkbook } from '@/lib/exportExcel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ScanLine,
  Check,
  X,
  Package,
  RefreshCw,
  ArrowRight,
  Inbox,
  ListChecks,
  Download,
  Search,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

async function exportPicksExcel(tasks) {
  await exportWmsWorkbook({
    fileName: `pick_tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    sheetName: 'Pick Tasks',
    title: 'WMS Picking Queue Export',
    columns: [
      { header: 'Order ID',  key: 'orderId',    width: 12, align: 'right' },
      { header: 'SO Number', key: 'soNumber',   width: 18 },
      { header: 'SKU',       key: 'skuCode',    width: 18 },
      { header: 'Bin',       key: 'binBarcode', width: 16 },
      { header: 'Qty',       key: 'quantity',   width: 10, align: 'right' },
      { header: 'Status',    key: 'status',     width: 14, align: 'center' },
    ],
    rows: tasks.map((t) => ({
      orderId:    t.orderId ?? '',
      soNumber:   t.soNumber ?? '',
      skuCode:    t.skuCode ?? t.sku ?? '',
      binBarcode: t.binBarcode ?? t.bin ?? '',
      quantity:   t.quantity ?? 1,
      status:     t.status ?? 'PENDING',
    })),
  });
  toast.success('Pick tasks exported to Excel');
}

export default function PickingPage() {
  const searchParams = useSearchParams();
  const urlOrderId = searchParams.get('orderId');

  const [trolley, setTrolley] = useState('');
  const [rack, setRack] = useState('');
  const [orderId, setOrderId] = useState(urlOrderId || '');
  const [search, setSearch] = useState('');

  const { startSession, scanItem, resetSession, expectedItems, scannedItems, isLoading } =
    usePickingSession();

  const { data: pendingTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['picking-pending'],
    queryFn: () => api.get('/picking/tasks/pending').then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const sessionActive = expectedItems.length > 0;
  const pickedCount = scannedItems.length;
  const totalCount = expectedItems.length;
  const progress = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0;

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return pendingTasks ?? [];
    const q = search.toLowerCase();
    return (pendingTasks ?? []).filter(
      (t) =>
        (t.skuCode ?? t.sku ?? '').toLowerCase().includes(q) ||
        (t.binBarcode ?? t.bin ?? '').toLowerCase().includes(q) ||
        (t.soNumber ?? '').toLowerCase().includes(q) ||
        String(t.orderId ?? '').includes(q),
    );
  }, [pendingTasks, search]);

  const queueTotal = useMemo(
    () => (pendingTasks ?? []).reduce((s, t) => s + (t.quantity ?? 1), 0),
    [pendingTasks],
  );

  const handleStart = (e) => {
    e.preventDefault();
    if (orderId) startSession(trolley || null, rack || null, orderId);
  };

  const autoStarted = useRef(false);

  // Auto-start if orderId is in URL and no session is active
  useEffect(() => {
    if (urlOrderId && !sessionActive && !autoStarted.current) {
      autoStarted.current = true;
      setOrderId(urlOrderId);
      startSession(null, null, urlOrderId);
    }
  }, [urlOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Picking"
        description="Manage pick tasks and run scan sessions on the warehouse floor."
        actions={
          <Button size="sm" variant="outline" onClick={() => exportPicksExcel(pendingTasks ?? [])} disabled={!pendingTasks?.length}>
            <Download className="size-3.5 mr-1.5" /> Export Excel
          </Button>
        }
      />

      {/* KPI row — only when no active session */}
      {!sessionActive && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            title="Tasks in Queue"
            value={pendingTasks?.length ?? 0}
            icon={ListChecks}
            kpiVariant="blue"
            accentClass="text-blue-500"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            title="Total Units"
            value={queueTotal}
            icon={Package}
            kpiVariant="purple"
            accentClass="text-violet-500"
            iconBg="bg-violet-500/10"
          />
          <StatCard
            title="Session Status"
            value={sessionActive ? 'Active' : 'Idle'}
            icon={ScanLine}
            kpiVariant={sessionActive ? 'green' : 'amber'}
            accentClass={sessionActive ? 'text-emerald-500' : 'text-amber-500'}
            iconBg={sessionActive ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
          />
        </div>
      )}

      {/* Session active — progress bar */}
      {sessionActive && (
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-medium text-foreground">Pick session in progress — Order #{orderId}</span>
              <span>
                {pickedCount} / {totalCount} items picked
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <span
            className={`text-lg font-bold tabular-nums ${
              progress === 100 ? 'text-emerald-500' : 'text-primary'
            }`}
          >
            {progress}%
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* Pending tasks panel */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ListChecks className="size-4" />
              Pending Pick Queue
            </h2>
            <RefreshCw
              className="size-3.5 text-muted-foreground"
              style={{
                animation: tasksLoading ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by SKU, bin, SO#, order ID…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="size-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {tasksLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !filteredTasks.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Inbox className="size-10 opacity-30" />
              <p className="text-sm">
                {pendingTasks?.length ? 'No tasks match the filter.' : 'No pending pick tasks'}
              </p>
            </div>
          ) : (
            <div className="thin-scrollbar overflow-y-auto max-h-96 rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>#</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task, idx) => (
                    <TableRow key={task.id} className="table-row-hover">
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs font-medium text-primary">{task.soNumber ?? `#${task.orderId}`}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {task.skuCode ?? task.sku}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary font-medium">
                        {task.binBarcode ?? task.bin}
                      </TableCell>
                      <TableCell>{task.quantity ?? 1}</TableCell>
                      <TableCell>
                        <StatusBadge status={task.status ?? 'PENDING'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Scan session panel */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <ScanLine className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Scan Session
            </h2>
          </div>

          {!sessionActive ? (
            <form onSubmit={handleStart} className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Enter the Sales Order ID to load pick tasks, then optionally scan trolley and rack barcodes.
              </p>
              <div className="relative">
                <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono text-sm"
                  placeholder="Sales Order ID (required)"
                  type="number"
                  min={1}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
              <ScanInput
                placeholder="Trolley barcode (optional)"
                value={trolley}
                onChange={setTrolley}
                onScan={setTrolley}
                className="font-mono text-sm"
                clearAfterScan={false}
              />
              <ScanInput
                placeholder="Rack compartment barcode (optional)"
                value={rack}
                onChange={setRack}
                onScan={setRack}
                className="font-mono text-sm"
                clearAfterScan={false}
              />
              <Button
                type="submit"
                disabled={isLoading || !orderId}
                className="w-full"
              >
                <ArrowRight className="size-4 mr-2" />
                Start Picking
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Order #{orderId} — {scannedItems.length}/{expectedItems.length} picked</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { resetSession(); setOrderId(''); setTrolley(''); setRack(''); }}>
                  <X className="size-3.5 mr-1" /> End Session
                </Button>
              </div>
              <Separator />

              <ScanInput
                onScan={(val) => { if (val) scanItem(val); }}
                placeholder="Scan item barcode and press Enter…"
                autoFocus
                disabled={isLoading}
                className="font-mono text-sm"
              />

              <ul className="thin-scrollbar overflow-y-auto max-h-72 space-y-1.5">
                {expectedItems.map((item) => {
                  const picked = scannedItems.includes(item.barcode);
                  return (
                    <li
                      key={item.barcode}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        picked
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {picked ? (
                        <Check className="size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <X className="size-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className="font-mono text-xs flex-1 truncate">
                        {item.sku ?? item.skuCode}
                      </span>
                      <span className="font-mono text-xs opacity-60 shrink-0">
                        {item.barcode}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {progress === 100 && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ All items picked — ready for packing!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
