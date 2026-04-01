'use client';
export const dynamic = 'force-dynamic';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import StatCard from '@/components/StatCard';
import api from '@/lib/api';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { P } from '@/lib/permissions';
import {
  BarChart2,
  Boxes,
  Clock3,
  GripVertical,
  Package,
  RefreshCw,
  ScanLine,
  Ship,
  ShoppingCart,
  AlertTriangle,
  Printer,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const STATE_COLORS = {
  RECEIVED: 'hsl(var(--wms-dock))',
  IN_PUTAWAY: '#f59e0b',
  AVAILABLE: '#10b981',
  RESERVED: '#8b5cf6',
  PICKED: '#d946ef',
  PACKED: '#14b8a6',
  SHIPPED: 'hsl(var(--wms-ship))',
};

const DEFAULT_WIDGET_VISIBILITY = {
  inventoryMix: true,
  operationsPulse: true,
  attentionQueue: true,
  liveEvents: true,
};

const DEFAULT_WIDGET_ORDER = ['inventoryMix', 'operationsPulse', 'attentionQueue', 'liveEvents'];

const fetchKpis = async () => {
  const { data } = await api.get('/dashboard/kpis');
  return data;
};

const fetchCharts = async (days) => {
  const { data } = await api.get('/dashboard/charts/shipments', { params: { days } });
  return data;
};

function ChartSkeleton() {
  return <Skeleton className="h-80 w-full rounded-3xl" />;
}

function ChartTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function PulseRow({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { can, role, username } = usePermissions();

  const [shipWindow, setShipWindow] = useState(7);
  const [widgetVisibility, setWidgetVisibility] = useState(DEFAULT_WIDGET_VISIBILITY);
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_WIDGET_ORDER);
  const [draggingWidget, setDraggingWidget] = useState(null);

  const { data: kpis, isLoading: kpisLoading, isError: kpisError, dataUpdatedAt } = useQuery({
    queryKey: ['dashboardKpis'],
    queryFn: fetchKpis,
    refetchInterval: 30000,
    retry: false,
  });

  const { data: charts, isLoading: chartsLoading, isError: chartsError } = useQuery({
    queryKey: ['dashboardCharts', shipWindow],
    queryFn: () => fetchCharts(shipWindow),
    refetchInterval: 30000,
    retry: false,
  });

  const inventoryByState = Object.entries(kpis?.inventoryByState ?? {}).map(([name, count]) => ({
    name,
    count,
  }));

  const shipments = (charts?.dailyShipments ?? charts ?? []).map((d) => ({
    ...d,
    date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const secondaryStats = [
    { label: 'Inbound Today', value: kpis?.inboundToday ?? 0, icon: Package },
    { label: 'Orders Today', value: kpis?.ordersToday ?? 0, icon: ShoppingCart },
    { label: 'Items Packed', value: kpis?.itemsPacked ?? 0, icon: Boxes },
    { label: 'Shipped Today', value: kpis?.shippedToday ?? kpis?.itemsShippedToday ?? 0, icon: Ship },
  ];

  const lastUpdated = dataUpdatedAt ? format(new Date(dataUpdatedAt), 'HH:mm:ss') : null;
  const totalInventoryUnits = inventoryByState.reduce((sum, state) => sum + Number(state.count || 0), 0);
  const weekShipped = shipments.reduce((sum, day) => sum + Number(day.count || 0), 0);
  const avgShipped = shipments.length ? Math.round(weekShipped / shipments.length) : 0;
  const peakShipmentDay = shipments.length
    ? shipments.reduce((max, day) => (Number(day.count || 0) > Number(max.count || 0) ? day : max), shipments[0])
    : null;
  const pickPressurePct = Math.min(
    100,
    Math.round(((kpis?.pendingPicks ?? 0) / Math.max(1, kpis?.openOrders ?? 0)) * 100),
  );

  const topStates = useMemo(
    () => [...inventoryByState].sort((a, b) => Number(b.count || 0) - Number(a.count || 0)).slice(0, 3),
    [inventoryByState],
  );

  const attentionQueue = useMemo(() => {
    const rows = [];
    if ((kpis?.pendingPicks ?? 0) > 0) {
      rows.push({ label: 'Picking Queue', value: `${kpis.pendingPicks} tasks waiting`, tone: 'amber' });
    }
    if ((kpis?.openOrders ?? 0) > 0) {
      rows.push({ label: 'Open Orders', value: `${kpis.openOrders} orders in fulfillment pipeline`, tone: 'blue' });
    }
    if ((kpis?.binUtilizationPct ?? 0) > 85) {
      rows.push({
        label: 'Bin Capacity',
        value: `${Number(kpis.binUtilizationPct).toFixed(1)}% utilization (high)`,
        tone: 'rose',
      });
    }
    if (!rows.length) {
      rows.push({ label: 'Operations', value: 'No critical alerts right now', tone: 'green' });
    }
    return rows;
  }, [kpis]);

  const liveEvents = useMemo(() => {
    return [
      {
        time: 'Now',
        label: 'Queue Snapshot',
        detail: `${kpis?.pendingPicks ?? 0} pending picks | ${kpis?.openOrders ?? 0} open orders`,
      },
      {
        time: '30s',
        label: 'Bin Utilization',
        detail: `${Number(kpis?.binUtilizationPct ?? 0).toFixed(1)}% across ${kpis?.totalBins ?? 0} bins`,
      },
      {
        time: '1m',
        label: 'Shipment Pace',
        detail: `${avgShipped} avg/day in last ${shipWindow} days`,
      },
      {
        time: '2m',
        label: 'Peak Day',
        detail: peakShipmentDay ? `${peakShipmentDay.date} reached ${peakShipmentDay.count} shipped` : 'No peak data available',
      },
    ];
  }, [kpis, avgShipped, peakShipmentDay, shipWindow]);

  const quickActions = [
    { label: 'Receive PO', icon: Package, href: '/inbound', permission: P.INBOUND_RECEIVE },
    { label: 'New Order', icon: ShoppingCart, href: '/orders', permission: P.ORDERS_CREATE },
    { label: 'Start Picking', icon: ScanLine, href: '/picking', permission: P.PICKING_EXECUTE },
    { label: 'Print Labels', icon: Printer, href: '/labels', permission: P.LABELS_PRINT },
    { label: 'View Reports', icon: TrendingUp, href: '/reports', permission: P.REPORTS_VIEW },
  ];
  const visibleQuickActions = quickActions.filter((action) => can(action.permission));
  const roleLabel = role ? role.replace('_', ' ') : 'USER';
  const isWorker = role === 'WORKER';
  const widgetStorageKey = `wms-dashboard-widgets-${username || 'guest'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(widgetStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.visibility) {
        setWidgetVisibility((prev) => ({ ...prev, ...saved.visibility }));
      }
      if (Array.isArray(saved?.order)) {
        const cleaned = DEFAULT_WIDGET_ORDER.filter((id) => saved.order.includes(id));
        const missing = DEFAULT_WIDGET_ORDER.filter((id) => !cleaned.includes(id));
        setWidgetOrder([...cleaned, ...missing]);
      }
    } catch {
      // ignore malformed localStorage
    }
  }, [widgetStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        widgetStorageKey,
        JSON.stringify({ visibility: widgetVisibility, order: widgetOrder }),
      );
    } catch {
      // localStorage may be unavailable
    }
  }, [widgetStorageKey, widgetVisibility, widgetOrder]);

  const orderedVisibleWidgets = widgetOrder.filter((id) => widgetVisibility[id]);
  const workerFocusedWidgets = ['operationsPulse', 'attentionQueue'];
  const visibleWidgetIds = isWorker
    ? orderedVisibleWidgets.filter((id) => workerFocusedWidgets.includes(id))
    : orderedVisibleWidgets;

  const onDropWidget = (targetId) => {
    if (!draggingWidget || draggingWidget === targetId) return;
    setWidgetOrder((prev) => {
      const without = prev.filter((id) => id !== draggingWidget);
      const idx = without.indexOf(targetId);
      if (idx < 0) return prev;
      without.splice(idx, 0, draggingWidget);
      return without;
    });
    setDraggingWidget(null);
  };

  const renderRightWidget = (id) => {
    if (id === 'inventoryMix') {
      return (
        <Card className="glass-card rounded-3xl py-4">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Inventory Mix</CardTitle>
            <CardDescription>Live distribution and total units.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {inventoryByState.length === 0 ? (
              <div className="flex h-55 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Boxes className="size-8 opacity-30" />
                <p className="text-sm">No inventory yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={215}>
                  <PieChart>
                    <Pie data={inventoryByState} dataKey="count" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3}>
                      {inventoryByState.map((entry) => (
                        <Cell key={entry.name} fill={STATE_COLORS[entry.name] || 'var(--primary)'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: 'var(--foreground)', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="mt-2 text-center text-xs text-muted-foreground">Total units tracked: <span className="font-semibold text-foreground">{totalInventoryUnits}</span></p>
              </>
            )}
          </CardContent>
        </Card>
      );
    }

    if (id === 'operationsPulse') {
      return (
        <Card className="glass-card rounded-3xl py-4">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" />
              Operations Pulse
            </CardTitle>
            <CardDescription>High-signal KPIs for fast floor decisions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <PulseRow
              label="Bin Utilization"
              value={`${Number(kpis?.binUtilizationPct ?? 0).toFixed(1)}%`}
              hint={`${kpis?.totalBins ?? 0} bins actively tracked`}
            />

            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Pick Pressure</span>
                <span className="font-semibold text-foreground">{pickPressurePct}%</span>
              </div>
              <Progress value={pickPressurePct} className="h-2" />
              <p className="mt-2 text-[11px] text-muted-foreground">Pending picks vs open orders load.</p>
            </div>

            <PulseRow
              label="7-Day Avg Shipped"
              value={`${avgShipped} / day`}
              hint={`Total ${weekShipped} units shipped in this window`}
            />

            <PulseRow
              label="Peak Shipment Day"
              value={peakShipmentDay ? `${peakShipmentDay.date} (${peakShipmentDay.count})` : 'N/A'}
              hint="Highest dispatch volume in current trend window"
            />

            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Top Inventory States</p>
              <div className="space-y-2">
                {topStates.length ? topStates.map((state) => (
                  <div key={state.name} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{state.name.replace('_', ' ')}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-foreground">{state.count}</span>
                  </div>
                )) : <p className="text-[11px] text-muted-foreground">No state data available</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2 text-xs text-primary">
              <Clock3 className="size-3.5" />
              Dashboard auto-sync interval: 30 seconds
            </div>
          </CardContent>
        </Card>
      );
    }

    if (id === 'attentionQueue') {
      return (
        <Card className="glass-card rounded-3xl py-4">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Attention Queue</CardTitle>
            <CardDescription>Priority signals requiring operator action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {attentionQueue.map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className={`rounded-xl border px-3 py-2 text-xs ${
                  item.tone === 'amber'
                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : item.tone === 'blue'
                    ? 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : item.tone === 'rose'
                    ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                <p className="font-semibold">{item.label}</p>
                <p className="mt-0.5 opacity-90">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="glass-card rounded-3xl py-4">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Live Event Feed</CardTitle>
          <CardDescription>Latest operational telemetry snapshots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {liveEvents.map((evt, idx) => (
            <div key={`${evt.label}-${idx}`} className="rounded-xl border border-border/60 bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">{evt.label}</p>
                <span className="text-[10px] text-muted-foreground">{evt.time}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{evt.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  if ((kpisLoading && !kpisError) || (chartsLoading && !chartsError)) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="glass-card rounded-3xl py-5">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={`Advanced control center for ${roleLabel}. Live pulse across inbound, picking, packing, and shipping.`}
        actions={
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden text-xs text-muted-foreground sm:block">Updated {lastUpdated}</span>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['dashboardKpis'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
            }}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
            <div className="ml-1 flex rounded-lg border border-border bg-background p-0.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setShipWindow(d)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    shipWindow === d
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card className="glass-card rounded-3xl py-4">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Operations Control Center</CardTitle>
              <CardDescription>Critical alerts, shortcuts, and same-screen pulse monitoring.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {kpis && (kpis.pendingPicks > 0 || kpis.openOrders > 0) && (
                <div className="flex flex-wrap gap-2">
                  {kpis.pendingPicks > 0 && (
                    <button onClick={() => router.push('/picking')} className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-colors">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {kpis.pendingPicks} pending pick task{kpis.pendingPicks !== 1 ? 's' : ''}
                    </button>
                  )}
                  {kpis.openOrders > 0 && (
                    <button onClick={() => router.push('/orders')} className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 transition-colors">
                      <ShoppingCart className="size-3.5 shrink-0" />
                      {kpis.openOrders} open order{kpis.openOrders !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {visibleQuickActions.map(({ label, icon: Icon, href }) => (
                  <Button key={label} size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => router.push(href)}>
                    <Icon className="size-3.5" />{label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {secondaryStats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <stat.icon className="size-3.5 text-primary" />
                    </div>
                    <p className="text-xl font-semibold leading-none">{stat.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <Card className="glass-card rounded-3xl py-4">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base">Daily Shipments</CardTitle>
                <CardDescription>Last {shipWindow} days throughput trend.</CardDescription>
              </CardHeader>
              <CardContent className="pt-3">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={shipments} margin={{ left: -16, right: 4, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="shipment-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--wms-ship))" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="hsl(var(--wms-ship))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="count" name="Shipped" stroke="hsl(var(--wms-ship))" strokeWidth={2.3} fill="url(#shipment-gradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-3xl py-4">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base">Inventory by State</CardTitle>
                <CardDescription>Compact state comparison.</CardDescription>
              </CardHeader>
              <CardContent className="pt-3">
                {inventoryByState.length === 0 ? (
                  <div className="flex h-55 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <BarChart2 className="size-8 opacity-30" />
                    <p className="text-sm">No inventory data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={inventoryByState} margin={{ left: -8, right: 4, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {inventoryByState.map((entry) => (
                          <Cell key={entry.name} fill={STATE_COLORS[entry.name] || 'var(--primary)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-3 xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto xl:pr-1">
          {!isWorker && (
            <Card className="glass-card rounded-3xl py-4">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base">Dashboard Layout</CardTitle>
                <CardDescription>Show/hide widgets and drag to reorder cards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {[
                  ['inventoryMix', 'Inventory Mix'],
                  ['operationsPulse', 'Operations Pulse'],
                  ['attentionQueue', 'Attention Queue'],
                  ['liveEvents', 'Live Event Feed'],
                ].map(([id, label]) => (
                  <label key={id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
                    <span className="text-foreground">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(widgetVisibility[id])}
                      onChange={(e) => setWidgetVisibility((prev) => ({ ...prev, [id]: e.target.checked }))}
                      className="size-4 accent-[hsl(var(--wms-primary))]"
                    />
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Total SKUs" value={kpis?.totalSkus} icon={Boxes} description="Catalog" />
            <StatCard title="Open Orders" value={kpis?.openOrders} icon={ShoppingCart} description="Awaiting" />
            <StatCard title="Pending Picks" value={kpis?.pendingPicks} icon={ScanLine} description="Queue" />
            <StatCard title="Shipped Today" value={kpis?.shippedToday ?? kpis?.itemsShippedToday} icon={Ship} description="Units" />
          </div>

          {visibleWidgetIds.map((widgetId) => (
            <div
              key={widgetId}
              draggable={!isWorker}
              onDragStart={() => !isWorker && setDraggingWidget(widgetId)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropWidget(widgetId)}
              className="group relative"
            >
              {!isWorker && (
                <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md border border-border/70 bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="size-3.5 text-muted-foreground" />
                </div>
              )}
              {renderRightWidget(widgetId)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
