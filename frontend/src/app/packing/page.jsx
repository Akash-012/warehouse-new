'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import {
  ScanLine,
  PackageCheck,
  ArrowRight,
  CheckCircle2,
  Box,
  Check,
  Printer,
  RotateCcw,
} from 'lucide-react';

export default function PackingPage() {
  const [trolleyBarcode, setTrolleyBarcode] = useState('');
  const [compartmentBarcode, setCompartmentBarcode] = useState('');
  const [manifest, setManifest] = useState(null);
  const [scanProgress, setScanProgress] = useState({});

  const startMutation = useMutation({
    mutationFn: ({ trolley, compartment }) =>
      api
        .post(
          `/packing/start?trolleyBarcode=${encodeURIComponent(trolley)}&compartmentBarcode=${encodeURIComponent(compartment)}`,
        )
        .then((r) => r.data),
    onSuccess: (data) => {
      setManifest(data);
      setScanProgress({});
      toast.success(`Manifest loaded â€” Order #${data.orderId}`);
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
        toast.success(`Item packed â€” ${result.remaining} remaining`);
      }
    },
    onError: () => toast.error('Scan failed â€” item not found in manifest'),
  });

  const handleLoadManifest = (e) => {
    e.preventDefault();
    if (trolleyBarcode && compartmentBarcode) {
      startMutation.mutate({ trolley: trolleyBarcode, compartment: compartmentBarcode });
    }
  };

  const handleScan = (e) => {
    e.preventDefault();
    const barcode = e.target.elements.itemBarcode.value.trim();
    if (barcode) {
      scanMutation.mutate(barcode);
      e.target.reset();
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

  return (
    <div className="flex flex-col gap-6">
      

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <PackageCheck className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Load Manifest
            </h2>
          </div>

          <form onSubmit={handleLoadManifest} className="flex flex-col gap-4">
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input className="pl-9 font-mono text-sm" placeholder="Trolley barcode" value={trolleyBarcode} onChange={(e) => setTrolleyBarcode(e.target.value)} disabled={!!manifest} />
            </div>
            <div className="relative">
              <Box className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input className="pl-9 font-mono text-sm" placeholder="Compartment barcode" value={compartmentBarcode} onChange={(e) => setCompartmentBarcode(e.target.value)} disabled={!!manifest} />
            </div>

            {!manifest ? (
              <Button type="submit" disabled={startMutation.isPending || !trolleyBarcode || !compartmentBarcode} className="w-full">
                <ArrowRight className="size-4 mr-2" />
                Load Manifest
              </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={handleReset}>
                <RotateCcw className="size-3.5 mr-2" />
                Clear and Start Over
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
                  <span className={`font-semibold ${isComplete ? 'text-emerald-500' : 'text-primary'}`}>{totalScanned} / {totalExpected} units</span>
                </div>
              </div>

              <form onSubmit={handleScan} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input name="itemBarcode" className="pl-9 font-mono text-sm" placeholder="Scan item barcode" autoFocus disabled={isComplete} />
                </div>
                <Button type="submit" disabled={scanMutation.isPending || isComplete}>Pack</Button>
              </form>
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
                <p className="text-xs text-muted-foreground mt-1.5">{totalScanned} of {totalExpected} items packed across {manifest.lines.length} SKU{manifest.lines.length !== 1 ? 's' : ''}</p>
              </div>

              <Separator />

              {isComplete ? (
                <div className="flex flex-col items-center gap-3 py-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="size-14 text-emerald-500" />
                  <div className="text-center">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">All Items Packed!</p>
                    <p className="text-xs text-muted-foreground mt-1">Order #{manifest.orderId} is ready to ship</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="size-3.5 mr-1.5" /> Print Manifest
                  </Button>
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
                            <span className={`font-mono font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>{line.skuCode}</span>
                          </div>
                          <span className={`text-xs tabular-nums ${done ? 'text-emerald-500' : 'text-muted-foreground'}`}>{scanned} / {line.expectedQty}</span>
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
