'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ScanInput } from '@/components/ui/ScanInput';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  PackageCheck,
  ArrowRight,
  CheckCircle2,
  Check,
  Printer,
  RotateCcw,
  List,
} from 'lucide-react';
import { format } from 'date-fns';

export default function PackingPage() {
  const [trolleyBarcode, setTrolleyBarcode] = useState('');
  const [compartmentBarcode, setCompartmentBarcode] = useState('');
  const [manifest, setManifest] = useState(null);
  const [scanProgress, setScanProgress] = useState({});

  const { data: packQueue, isLoading: queueLoading } = useQuery({
    queryKey: ['pack-queue'],
    queryFn: () => api.get('/orders').then((r) =>
      (r.data ?? []).filter((o) => (o.status ?? o.state ?? '').toUpperCase() === 'PICKED')
    ),
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: false,
  });

  const startMutation = useMutation({
    mutationFn: ({ trolley, compartment }) =>
      api.post(
        `/packing/start?trolleyBarcode=${encodeURIComponent(trolley)}&compartmentBarcode=${encodeURIComponent(compartment)}`,
      ).then((r) => r.data),
    onSuccess: (data) => {
      setManifest(data);
      setScanProgress({});
      toast.success(`Manifest loaded — Order #${data.orderId}`);
    },
    onError: () => toast.error('Failed to load packing manifest'),
  });

  const scanMutation = useMutation({
    mutationFn: (itemBarcode) =>
      api.post('/packing/scan', { itemBarcode, compartmentBarcode }).then((r) => r.data),
    onSuccess: (result, itemBarcode) => {
      const line = manifest?.lines.find((l) => l.itemBarcodes?.includes(itemBarcode));
      if (line) {
        setScanProgress((prev) => ({
          ...prev,
          [line.skuCode]: Math.min((prev[line.skuCode] || 0) + 1, line.expectedQty),
        }));
      }
      if (result.complete) {
        toast.success('Packing complete! All items packed.');
      } else {
        toast.success(`Item packed — ${result.remaining} remaining`);
      }
    },
    onError: () => toast.error('Scan failed — item not found in manifest'),
  });

  const handleLoadManifest = (e) => {
    e.preventDefault();
    if (trolleyBarcode && compartmentBarcode) {
      startMutation.mutate({ trolley: trolleyBarcode, compartment: compartmentBarcode });
    }
  };

  const handleReset = () => {
    setManifest(null);
    setTrolleyBarcode('');
    setCompartmentBarcode('');
    setScanProgress({});
  };

  const totalExpected = manifest?.lines.reduce((s, l) => s + l.expectedQty, 0) ?? 0;
  const totalScanned = Object.values(scanProgress).reduce((s, v) => s + v, 0);
  const globalProgress = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 0;
  const isComplete = totalExpected > 0 && totalScanned >= totalExpected;

  const printPackingSlip = () => {
    if (!manifest) return;
    const win = window.open('', '_blank', 'width=600,height=800');
    win.document.write(`
      <html><head><title>Packing Slip - Order #${manifest.orderId}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h2{margin:0 0 4px}p{margin:2px 0;color:#555;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}th{background:#f5f5f5}@media print{.no-print{display:none}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h2>Packing Slip</h2><p>Order #${manifest.orderId}</p>${manifest.customerName ? '<p>Customer: ' + manifest.customerName + '</p>' : ''}</div>
        <div style="text-align:right"><p style="font-size:12px">Date: ${new Date().toLocaleDateString()}</p></div>
      </div>
      <table><thead><tr><th>#</th><th>SKU</th><th>Expected Qty</th><th>Packed Qty</th></tr></thead><tbody>
      ${manifest.lines.map((l, i) => '<tr><td>' + (i+1) + '</td><td>' + l.skuCode + '</td><td>' + l.expectedQty + '</td><td>' + (scanProgress[l.skuCode] || 0) + '</td></tr>').join('')}
      </tbody></table>
      <p style="margin-top:20px;font-size:12px;color:#888">All items verified and packed by warehouse team.</p>
      <button class="no-print" onclick="window.print()" style="margin-top:12px;padding:8px 16px;cursor:pointer">Print</button>
      </body></html>
    `);
    win.document.close();
    win.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Packing" description="Load manifests and verify items before dispatch." />

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <List className="size-4" /> Orders Ready to Pack
          </h2>
          <Badge variant="outline">{packQueue?.length ?? 0} orders</Badge>
        </div>
        {queueLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (packQueue?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <CheckCircle2 className="size-8 opacity-30" />
            <p className="text-sm">No orders waiting to be packed</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-48 rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packQueue.map((order) => (
                  <TableRow key={order.id} className="table-row-hover">
                    <TableCell className="font-bold text-primary">#{order.id}</TableCell>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell><StatusBadge status={order.status ?? order.state} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <PackageCheck className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Load Manifest</h2>
          </div>

          <form onSubmit={handleLoadManifest} className="flex flex-col gap-4">
            <ScanInput
              className="font-mono text-sm"
              placeholder="Trolley barcode"
              value={trolleyBarcode}
              onChange={setTrolleyBarcode}
              onScan={setTrolleyBarcode}
              disabled={!!manifest}
              clearAfterScan={false}
            />
            <ScanInput
              className="font-mono text-sm"
              placeholder="Compartment barcode"
              value={compartmentBarcode}
              onChange={setCompartmentBarcode}
              onScan={setCompartmentBarcode}
              disabled={!!manifest}
              clearAfterScan={false}
            />
            {!manifest ? (
              <Button type="submit" disabled={startMutation.isPending || !trolleyBarcode || !compartmentBarcode} className="w-full">
                <ArrowRight className="size-4 mr-2" /> Load Manifest
              </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={handleReset}>
                <RotateCcw className="size-3.5 mr-2" /> Clear and Start Over
              </Button>
            )}
          </form>

          {manifest && (
            <>
              <Separator />
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-semibold">#{manifest.orderId}</span>
                </div>
                {manifest.customerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{manifest.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lines</span>
                  <span className="font-medium">{manifest.lines.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress</span>
                  <span className={`font-semibold ${isComplete ? 'text-emerald-500' : 'text-primary'}`}>
                    {totalScanned} / {totalExpected} units
                  </span>
                </div>
              </div>
              <ScanInput
                onScan={(val) => { if (val) scanMutation.mutate(val); }}
                placeholder="Scan item barcode and press Enter..."
                autoFocus
                disabled={isComplete || scanMutation.isPending}
                className="font-mono text-sm"
              />
            </>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col gap-5">
          {!manifest ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <PackageCheck className="size-12 opacity-30" />
              <p className="text-sm">Load a manifest to begin packing</p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">Order #{manifest.orderId}</span>
                  <span className={`font-bold ${isComplete ? 'text-emerald-500' : 'text-primary'}`}>{globalProgress}%</span>
                </div>
                <Progress value={globalProgress} className={`h-2.5 ${isComplete ? '[&>div]:bg-emerald-500' : ''}`} />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {totalScanned} of {totalExpected} items packed across {manifest.lines.length} SKU{manifest.lines.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Separator />
              {isComplete ? (
                <div className="flex flex-col items-center gap-3 py-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="size-14 text-emerald-500" />
                  <div className="text-center">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">All Items Packed!</p>
                    <p className="text-xs text-muted-foreground mt-1">Order #{manifest.orderId} is ready to ship</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={printPackingSlip}>
                      <Printer className="size-3.5 mr-1.5" /> Print Packing Slip
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <RotateCcw className="size-3.5 mr-1.5" /> New Order
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 thin-scrollbar overflow-y-auto max-h-96">
                  {manifest.lines.map((line) => {
                    const scanned = scanProgress[line.skuCode] || 0;
                    const pct = Math.round((scanned / line.expectedQty) * 100);
                    const done = scanned >= line.expectedQty;
                    return (
                      <div key={line.skuCode} className="space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            {done ? (
                              <span className="size-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                <Check className="size-3 text-emerald-500" />
                              </span>
                            ) : (
                              <span className="size-5 rounded-full border-2 border-border shrink-0" />
                            )}
                            <span className={`font-mono font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                              {line.skuCode}
                            </span>
                          </div>
                          <span className={`text-xs tabular-nums ${done ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                            {scanned} / {line.expectedQty}
                          </span>
                        </div>
                        <Progress value={pct} className={`h-1.5 ${done ? '[&>div]:bg-emerald-500' : ''}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
