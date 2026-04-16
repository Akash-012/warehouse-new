'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ClipboardList, Eye, FileDown, Search, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(String(val).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
};

function GrnPrintView({ grn }) {
  const date = parseDate(grn.createdAt);
  const fmt2 = (n) => n != null ? Number(n).toFixed(2) : '—';
  return (
    <div id="grn-print-area" className="p-8 font-sans text-sm text-gray-900 bg-white min-w-[600px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Goods Receipt Note</h1>
          <p className="text-gray-500 text-xs mt-1">WMS Pro — Warehouse Management System</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-bold text-blue-700">{grn.grnNo}</p>
          <p className="text-xs text-gray-500">{date ? format(date, 'dd MMM yyyy, HH:mm') : '—'}</p>
        </div>
      </div>

      <hr className="border-gray-300 mb-5" />

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1.5">
          <Row label="GRN Number" value={grn.grnNo} />
          <Row label="PO Number" value={grn.poNumber} />
          <Row label="Supplier" value={grn.supplier || '—'} />
        </div>
        <div className="space-y-1.5">
          <Row label="Date Received" value={date ? format(date, 'dd MMM yyyy') : '—'} />
          <Row label="Time" value={date ? format(date, 'HH:mm:ss') : '—'} />
          <Row label="Total Ordered" value={grn.totalOrdered ?? '—'} />
          <Row label="Total Received" value={grn.totalItems} />
          <Row label="Total Pending" value={grn.totalPending ?? '—'} />
        </div>
      </div>

      {/* Lines table */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">#</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">SKU Code</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Batch</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Ordered</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Received</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Pending</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Unit Price</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Line Total</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">SGST%</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">CGST%</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">GST Amt</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {(grn.lines ?? []).map((line, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 px-3 py-2">{i + 1}</td>
              <td className="border border-gray-300 px-3 py-2 font-mono font-semibold">{line.skuCode}</td>
              <td className="border border-gray-300 px-3 py-2">{line.skuDescription || '—'}</td>
              <td className="border border-gray-300 px-3 py-2 font-mono">{line.batchNo || '—'}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{line.orderedQty ?? '—'}</td>
              <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{line.receivedQty ?? line.quantity}</td>
              <td className="border border-gray-300 px-3 py-2 text-right text-orange-600 font-semibold">{line.pendingQty ?? '—'}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">₹{fmt2(line.unitPrice)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">₹{fmt2(line.lineTotal)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{fmt2(line.sgstRate)}%</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{fmt2(line.cgstRate)}%</td>
              <td className="border border-gray-300 px-3 py-2 text-right">₹{fmt2(line.gstAmount)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right font-semibold">₹{fmt2(line.lineTotalWithTax)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tax Summary */}
      <div className="flex justify-end mt-4">
        <table className="text-xs border-collapse w-64">
          <tbody>
            <tr><td className="border border-gray-300 px-3 py-1.5 text-gray-600">Sub Total</td><td className="border border-gray-300 px-3 py-1.5 text-right font-semibold">₹{fmt2(grn.subTotal)}</td></tr>
            <tr><td className="border border-gray-300 px-3 py-1.5 text-gray-600">SGST</td><td className="border border-gray-300 px-3 py-1.5 text-right">₹{fmt2(grn.totalSgst)}</td></tr>
            <tr><td className="border border-gray-300 px-3 py-1.5 text-gray-600">CGST</td><td className="border border-gray-300 px-3 py-1.5 text-right">₹{fmt2(grn.totalCgst)}</td></tr>
            <tr><td className="border border-gray-300 px-3 py-1.5 text-gray-600">Total GST</td><td className="border border-gray-300 px-3 py-1.5 text-right">₹{fmt2(grn.totalGst)}</td></tr>
            <tr className="bg-gray-100 font-bold"><td className="border border-gray-300 px-3 py-2">Grand Total</td><td className="border border-gray-300 px-3 py-2 text-right text-blue-700">₹{fmt2(grn.grandTotal)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 grid grid-cols-3 gap-8 text-xs text-gray-600">
        <div className="border-t border-gray-400 pt-2 text-center">Received By</div>
        <div className="border-t border-gray-400 pt-2 text-center">Checked By</div>
        <div className="border-t border-gray-400 pt-2 text-center">Authorized By</div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-28 shrink-0">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function printGrn(grn) {
  const date = parseDate(grn.createdAt);
  const fmt = (d, f) => {
    if (!d) return '—';
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (f === 'dd MMM yyyy') return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
    if (f === 'dd MMM yyyy, HH:mm') return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (f === 'HH:mm:ss') return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return d.toLocaleString();
  };
  const m = (n) => n != null ? `&#8377;${Number(n).toFixed(2)}` : '—';
  const pct = (n) => n != null ? `${Number(n).toFixed(2)}%` : '—';

  const lines = (grn.lines ?? []).map((line, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="border:1px solid #d1d5db;padding:6px 8px">${i + 1}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;font-family:monospace;font-weight:600">${line.skuCode}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px">${line.skuDescription || '—'}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;font-family:monospace">${line.batchNo || '—'}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right">${line.orderedQty ?? '—'}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;font-weight:600">${line.receivedQty ?? line.quantity}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;color:#ea580c;font-weight:600">${line.pendingQty ?? '—'}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right">${m(line.unitPrice)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right">${m(line.lineTotal)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right">${pct(line.sgstRate)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right">${pct(line.cgstRate)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right">${m(line.gstAmount)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;font-weight:600">${m(line.lineTotalWithTax)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${grn.grnNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
  @media print { body { padding: 0; } @page { margin: 12mm; size: A4 landscape; } }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: 700; color: #1e293b; }
  .header .sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .grn-no { font-size: 16px; font-family: monospace; font-weight: 700; color: #1d4ed8; text-align: right; }
  .grn-date { font-size: 11px; color: #6b7280; text-align: right; margin-top: 3px; }
  hr { border: none; border-top: 1px solid #d1d5db; margin-bottom: 16px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .meta-row { display: flex; gap: 8px; margin-bottom: 5px; }
  .meta-label { color: #6b7280; width: 110px; flex-shrink: 0; }
  .meta-value { font-weight: 600; }
  .pending { color: #ea580c; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead tr { background: #f3f4f6; }
  th { border: 1px solid #d1d5db; padding: 7px 8px; text-align: left; font-weight: 600; white-space: nowrap; }
  .summary-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
  .summary { border-collapse: collapse; width: 260px; font-size: 12px; }
  .summary td { border: 1px solid #d1d5db; padding: 6px 10px; }
  .summary .grand { background: #eff6ff; font-weight: 700; color: #1d4ed8; }
  .sig { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; margin-top: 40px; }
  .sig-box { border-top: 1px solid #9ca3af; padding-top: 8px; text-align: center; font-size: 11px; color: #6b7280; }
</style>
</head><body>
  <div class="header">
    <div><h1>Goods Receipt Note</h1><div class="sub">WMS Pro — Warehouse Management System</div></div>
    <div><div class="grn-no">${grn.grnNo}</div><div class="grn-date">${fmt(date, 'dd MMM yyyy, HH:mm')}</div></div>
  </div>
  <hr/>
  <div class="meta">
    <div>
      <div class="meta-row"><span class="meta-label">GRN Number</span><span class="meta-value">${grn.grnNo}</span></div>
      <div class="meta-row"><span class="meta-label">PO Number</span><span class="meta-value">${grn.poNumber}</span></div>
      <div class="meta-row"><span class="meta-label">Supplier</span><span class="meta-value">${grn.supplier || '—'}</span></div>
    </div>
    <div>
      <div class="meta-row"><span class="meta-label">Date Received</span><span class="meta-value">${fmt(date, 'dd MMM yyyy')}</span></div>
      <div class="meta-row"><span class="meta-label">Time</span><span class="meta-value">${fmt(date, 'HH:mm:ss')}</span></div>
      <div class="meta-row"><span class="meta-label">Total Ordered</span><span class="meta-value">${grn.totalOrdered ?? '—'}</span></div>
      <div class="meta-row"><span class="meta-label">Total Received</span><span class="meta-value">${grn.totalItems}</span></div>
      <div class="meta-row"><span class="meta-label">Total Pending</span><span class="meta-value pending">${grn.totalPending ?? '—'}</span></div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>SKU Code</th><th>Description</th><th>Batch</th>
      <th style="text-align:right">Ordered</th>
      <th style="text-align:right">Received</th>
      <th style="text-align:right">Pending</th>
      <th style="text-align:right">Unit Price</th>
      <th style="text-align:right">Line Total</th>
      <th style="text-align:right">SGST%</th>
      <th style="text-align:right">CGST%</th>
      <th style="text-align:right">GST Amt</th>
      <th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <div class="summary-wrap">
    <table class="summary">
      <tr><td>Sub Total</td><td style="text-align:right">${m(grn.subTotal)}</td></tr>
      <tr><td>SGST</td><td style="text-align:right">${m(grn.totalSgst)}</td></tr>
      <tr><td>CGST</td><td style="text-align:right">${m(grn.totalCgst)}</td></tr>
      <tr><td>Total GST</td><td style="text-align:right">${m(grn.totalGst)}</td></tr>
      <tr class="grand"><td>Grand Total</td><td style="text-align:right">${m(grn.grandTotal)}</td></tr>
    </table>
  </div>
  <div class="sig">
    <div class="sig-box">Received By</div>
    <div class="sig-box">Checked By</div>
    <div class="sig-box">Authorized By</div>
  </div>
</body></html>`;

  const win = window.open('', '_blank', 'width=1100,height=800');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export default function GrnPage() {
  const [search, setSearch] = useState('');
  const [viewGrn, setViewGrn] = useState(null);

  const { data: grns, isLoading } = useQuery({
    queryKey: ['grns'],
    queryFn: () => api.get('/inbound/grns').then((r) => r.data ?? []),
    staleTime: 30_000,
    retry: false,
  });

  const filtered = useMemo(() => {
    const list = grns ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((g) =>
      g.grnNo?.toLowerCase().includes(q) ||
      g.poNumber?.toLowerCase().includes(q) ||
      g.supplier?.toLowerCase().includes(q)
    );
  }, [grns, search]);

  const stats = useMemo(() => {
    const list = grns ?? [];
    const totalItems = list.reduce((s, g) => s + (g.totalItems ?? 0), 0);
    return { count: list.length, totalItems };
  }, [grns]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        description="View and export GRNs generated from received purchase orders."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard title="Total GRNs" value={stats.count} icon={ClipboardList} kpiVariant="blue" accentClass="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard title="Total Items Received" value={stats.totalItems} icon={ClipboardList} kpiVariant="green" accentClass="text-emerald-500" iconBg="bg-emerald-500/10" />
      </div>

      <div className="glass-card overflow-hidden rounded-[2rem]">
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm w-full sm:max-w-64"
              placeholder="Search GRN, PO, supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSearch('')}>
              <X className="size-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableHead>GRN Number</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Total Items</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filtered.length ? (
              filtered.map((grn) => {
                const d = parseDate(grn.createdAt);
                return (
                  <TableRow key={grn.id} className="table-row-hover">
                    <TableCell className="font-bold font-mono text-primary">{grn.grnNo}</TableCell>
                    <TableCell className="font-mono text-sm">{grn.poNumber}</TableCell>
                    <TableCell>{grn.supplier || '—'}</TableCell>
                    <TableCell className="font-semibold">{grn.lines?.length ?? 0}</TableCell>
                    <TableCell className="font-semibold">{grn.totalItems}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {d ? format(d, 'dd MMM yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewGrn(grn)}>
                          <Eye className="size-3 mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setViewGrn(grn); setTimeout(() => printGrn(grn), 100); }}>
                          <FileDown className="size-3 mr-1" /> PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-3 size-8 opacity-30" />
                  {search ? 'No GRNs match the search.' : 'No GRNs found. Receive a PO to generate one.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View / Print Dialog */}
      <Dialog open={!!viewGrn} onOpenChange={(v) => !v && setViewGrn(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>GRN — {viewGrn?.grnNo}</DialogTitle>
              {viewGrn && (
                <Button size="sm" variant="outline" className="mr-8" onClick={() => printGrn(viewGrn)}>
                  <FileDown className="size-3.5 mr-1.5" /> Export PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewGrn && <GrnPrintView grn={viewGrn} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
