'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import api from '@/lib/api';
import {
  BarChart2,
  Download,
  Boxes,
  ShoppingCart,
  Ship,
  Package,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(THIRTY_DAYS_AGO);
  const [toDate, setToDate] = useState(TODAY);

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => api.get('/reports/kpis').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: inventoryByState } = useQuery({
    queryKey: ['inventory-by-state'],
    queryFn: () => api.get('/reports/inventory-by-state').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: shipmentsTrend } = useQuery({
    queryKey: ['shipments-trend'],
    queryFn: () =>
      api
        .get('/reports/shipments-by-day', { params: { from: fromDate, to: toDate } })
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 60_000,
  });

  const exportCSV = (path) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api${path}`;
    window.open(url, '_blank');
  };

  const exports = [
    { label: 'Inventory CSV',    icon: Boxes,        path: '/reports/inventory.csv',  desc: 'All SKUs with current stock levels' },
    { label: 'Orders CSV',       icon: ShoppingCart, path: '/reports/orders.csv',     desc: 'Sales orders with line items' },
    { label: 'Inbound GRNs CSV', icon: Package,      path: '/reports/grns.csv',       desc: 'Goods received notes' },
    { label: 'Shipments CSV',    icon: Ship,         path: '/reports/shipments.csv',  desc: 'Dispatch records with AWB nos.' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Export data and view warehouse analytics."
        actions={
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={TODAY}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        }
      />

      {/* KPI row */}
      {kpis && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total SKUs"       value={kpis.totalSkus ?? 'â€”'}       icon={Boxes}        kpiVariant="blue"   accentClass="text-blue-500"    iconBg="bg-blue-500/10" />
          <StatCard title="Open Orders"      value={kpis.openOrders ?? 'â€”'}      icon={ShoppingCart} kpiVariant="amber"  accentClass="text-amber-500"   iconBg="bg-amber-500/10" />
          <StatCard title="Pending Picks"    value={kpis.pendingPicks ?? 'â€”'}    icon={BarChart2}    kpiVariant="rose"   accentClass="text-rose-500"    iconBg="bg-rose-500/10" />
          <StatCard title="Shipments Today"  value={kpis.shipmentsToday ?? 'â€”'}  icon={Ship}         kpiVariant="green"  accentClass="text-emerald-500" iconBg="bg-emerald-500/10" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Export center */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Data Exports</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {exports.map(({ label, icon: Icon, path, desc }) => (
              <button
                key={path}
                onClick={() => exportCSV(path)}
                className="glass-card flex items-center gap-3 rounded-xl p-4 text-left hover:bg-primary/5 transition-colors group card-hover"
              >
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">{desc}</p>
                </div>
                <Download className="size-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Inventory by state */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Inventory by State</h2>
          </div>
          {inventoryByState?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={inventoryByState} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="state" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {inventoryByState.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <BarChart2 className="size-10 opacity-30" />
              <p className="text-sm">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Shipments trend chart */}
      <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Shipments Trend</h2>
          <span className="ml-auto text-xs text-muted-foreground">{fromDate} â€” {toDate}</span>
        </div>
        {shipmentsTrend?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={shipmentsTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="shipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#shipGrad)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <TrendingUp className="size-10 opacity-30" />
            <p className="text-sm">No shipment trend data â€” adjust the date range above</p>
          </div>
        )}
      </div>
    </div>
  );
}
