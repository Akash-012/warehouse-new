'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import BarcodeImage from '@/components/BarcodeImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Tag, ScanLine, Plus, X, Printer, ClipboardList, ShoppingCart } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { P } from '@/lib/permissions';

const TYPE_OPTIONS = ['Item', 'Bin', 'Trolley'];

export default function LabelsPage() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [labelType, setLabelType] = useState('Item');
  const [barcodes, setBarcodes] = useState([]);
  const { can } = usePermissions();

  const { data: purchaseOrders } = useQuery({
    queryKey: ['purchase-orders-list'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data),
    staleTime: 60_000,
    enabled: can(P.INBOUND_VIEW),
    retry: false,
  });

  const { data: orders } = useQuery({
    queryKey: ['orders-list'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    staleTime: 60_000,
    enabled: can(P.ORDERS_VIEW),
    retry: false,
  });

  const addBarcode = (e) => {
    e.preventDefault();
    const val = barcodeInput.trim();
    if (!val) return;
    if (barcodes.find((b) => b.value === val)) {
      toast.info('Barcode already in list');
      return;
    }
    setBarcodes((prev) => [...prev, { value: val, type: labelType, qty: 1 }]);
    setBarcodeInput('');
  };

  const removeBarcode = (val) => setBarcodes((prev) => prev.filter((b) => b.value !== val));

  const updateQty = (val, qty) => {
    const n = Math.max(1, Math.min(100, Number(qty)));
    setBarcodes((prev) => prev.map((b) => b.value === val ? { ...b, qty: n } : b));
  };

  const addFromPO = (po) => {
    const items = po.lineItems ?? po.items ?? [];
    if (!items.length) { toast.warning('No items in this PO'); return; }
    let added = 0;
    setBarcodes((prev) => {
      const next = [...prev];
      for (const item of items) {
        const barcode = item.barcode ?? item.sku ?? item.skuId ?? String(item.id);
        if (!next.find((b) => b.value === barcode)) {
          next.push({ value: barcode, type: 'Item', qty: item.quantity ?? 1 });
          added++;
        }
      }
      return next;
    });
    toast.success(`Added ${added} barcode(s) from PO #${po.id}`);
  };

  const addFromOrder = (order) => {
    const items = order.lineItems ?? order.items ?? [];
    if (!items.length) { toast.warning('No items in this order'); return; }
    let added = 0;
    setBarcodes((prev) => {
      const next = [...prev];
      for (const item of items) {
        const barcode = item.barcode ?? item.sku ?? item.skuId ?? String(item.id);
        if (!next.find((b) => b.value === barcode)) {
          next.push({ value: barcode, type: 'Item', qty: item.quantity ?? 1 });
          added++;
        }
      }
      return next;
    });
    toast.success(`Added ${added} barcode(s) from Order #${order.id}`);
  };

  const printAll = () => {
    const expanded = barcodes.flatMap((bc) => Array(bc.qty).fill(bc));
    if (!expanded.length) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    const cards = expanded
      .map(
        (bc) => `<div class="label">
          <p class="type">${bc.type}</p>
          <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(bc.value)}&code=Code128&dpi=96" alt="${bc.value}" style="width:100%;max-height:60px;object-fit:contain" />
          <p class="code">${bc.value}</p>
        </div>`,
      )
      .join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Labels</title><style>
      body{margin:0;font-family:monospace;}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;padding:8mm;}
      .label{border:1px solid #ccc;border-radius:4px;padding:4mm;text-align:center;page-break-inside:avoid;}
      .type{font-size:8px;text-transform:uppercase;color:#666;margin:0 0 2mm;}
      .code{font-size:9px;color:#333;margin:2mm 0 0;word-break:break-all;}
      @media print{@page{margin:5mm;}button{display:none}}
    </style></head><body>
      <div style="text-align:center;padding:4mm">
        <button onclick="window.print()" style="padding:6px 16px;font-size:13px;cursor:pointer">Print</button>
      </div>
      <div class="grid">${cards}</div>
    </body></html>`);
    win.document.close();
    toast.success(`Printing ${expanded.length} label(s)`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Labels" description="Generate and print barcodes for items, bins, and trolleys." />
      {/* Label generation form and actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Batch from PO */}
        {purchaseOrders?.length > 0 && (
          <Select
            onValueChange={(id) => {
              const po = purchaseOrders.find((p) => String(p.id) === id);
              if (po) addFromPO(po);
            }}
          >
            <SelectTrigger className="h-9 text-sm w-40">
              <ClipboardList className="mr-1.5 size-4" />
              <SelectValue placeholder="From PO" />
            </SelectTrigger>
            <SelectContent>
              {purchaseOrders.map((po) => (
                <SelectItem key={po.id} value={String(po.id)}>
                  PO #{po.id}{po.supplierName ? ` — ${po.supplierName}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {/* Batch from Order */}
        {orders?.length > 0 && (
          <Select
            onValueChange={(id) => {
              const order = orders.find((o) => String(o.id) === id);
              if (order) addFromOrder(order);
            }}
          >
            <SelectTrigger className="h-9 text-sm w-44">
              <ShoppingCart className="mr-1.5 size-4" />
              <SelectValue placeholder="From Order" />
            </SelectTrigger>
            <SelectContent>
              {orders.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  Order #{o.id}{o.customerName ? ` — ${o.customerName}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {barcodes.length > 0 && (
          <Button size="sm" onClick={printAll}>
            <Printer className="mr-1.5 size-4" />
            Print All ({barcodes.reduce((s, b) => s + b.qty, 0)})
          </Button>
        )}
      </div>

      <form onSubmit={addBarcode} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-9 font-mono text-sm"
            placeholder="Scan or type barcode..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            autoFocus
          />
        </div>
        {/* Type selector */}
        <div className="flex rounded-lg border border-input overflow-hidden shrink-0">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setLabelType(t)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                labelType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={!barcodeInput.trim()} size="sm">
          <Plus className="size-4 mr-1.5" />
          Add
        </Button>
      </form>

      {barcodes.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Tag className="size-12 opacity-30" />
          <p className="text-sm">Scan or type a barcode above, or import from a PO / Order</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3">
          {barcodes.map((bc) => (
            <div
              key={bc.value}
              className="glass-card rounded-2xl p-4 flex flex-col gap-3 relative group print:border print:shadow-none"
            >
              <button
                onClick={() => removeBarcode(bc.value)}
                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all print:hidden"
              >
                <X className="size-3.5" />
              </button>
              <div className="flex items-center justify-between print:hidden">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  bc.type === 'Item' ? 'bg-blue-500/12 text-blue-600' :
                  bc.type === 'Bin'  ? 'bg-emerald-500/12 text-emerald-600' :
                  'bg-amber-500/12 text-amber-600'
                }`}>{bc.type}</span>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={bc.qty}
                    onChange={(e) => updateQty(bc.value, e.target.value)}
                    className="h-6 w-14 text-xs text-center px-1"
                  />
                </div>
              </div>
              <BarcodeImage barcode={bc.value} className="w-full" />
              <p className="text-center font-mono text-xs text-muted-foreground truncate">{bc.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
