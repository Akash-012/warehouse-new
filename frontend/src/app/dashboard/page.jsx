'use client';
export const dynamic = 'force-dynamic';

import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import api from '@/lib/api';
import {
  BarChart2,
  Boxes,
  Package,
  RefreshCw,
  ScanLine,
  Ship,
  ShoppingCart,
} from 'lucide-react';

const STATE_COLORS = {
  RECEIVED: 'hsl(var(--wms-dock))',
  IN_PUTAWAY: '#f59e0b',
  AVAILABLE: '#10b981',
  RESERVED: '#8b5cf6',
  PICKED: '#d946ef',
  PACKED: '#14b8a6',
  SHIPPED: 'hsl(var(--wms-ship))',
};

const fetchKpis = async () => {
  const { data } = await api.get('/dashboard/kpis');
  return data;
};

const fetchCharts = async () => {
  const { data } = await api.get('/dashboard/charts/shipments', { params: { days: 7 } });
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

const DashboardPage = () => {
  const queryClient = useQueryClient();

  const { data: kpis, isLoading: kpisLoading, isError: kpisError, dataUpdatedAt } = useQuery({
    queryKey: ['dashboardKpis'],
    queryFn: fetchKpis,
    refetchInterval: 30000,
    retry: false,
  });

  const { data: charts, isLoading: chartsLoading, isError: chartsError } = useQuery({
    queryKey: ['dashboardCharts'],
    queryFn: fetchCharts,
    refetchInterval: 30000,
    retry: false,
  });

  const inventoryByState = Object.entries(kpis?.inventoryByState ?? {}).map(([name, count]) => ({
    name,
    count,
  }));

  const shipments = charts?.dailyShipments ?? charts ?? [];

  const secondaryStats = [
    { label: 'Inbound Today', value: kpis?.inboundToday ?? 0, icon: Package },
    { label: 'Orders Today', value: kpis?.ordersToday ?? 0, icon: ShoppingCart },
    { label: 'Items Packed', value: kpis?.itemsPacked ?? 0, icon: Boxes },
    { label: 'Shipped Today', value: kpis?.shippedToday ?? kpis?.itemsShippedToday ?? 0, icon: Ship },
  ];

  const lastUpdated = dataUpdatedAt ? format(new Date(dataUpdatedAt), 'HH:mm:ss') : null;

  if (kpisLoading && !kpisError || chartsLoading && !chartsError) {
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
    <div className="space-y-6">

      <PageHeader
        title="Dashboard"
        description="Real-time overview of warehouse operations. Data refreshes automatically every 30 seconds."
        breadcrumbs={[{ label: 'Dashboard' }]}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden text-xs text-muted-foreground sm:block">
                Updated {lastUpdated}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['dashboardKpis'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
              }}
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total SKUs" value={kpis?.totalSkus} icon={Boxes} description="Tracked catalog items" />
        <StatCard title="Bin Utilization" value={kpis?.binUtilizationPct?.toFixed?.(1) ?? kpis?.binsUtilization?.toFixed?.(1)} valueSuffix="%" icon={BarChart2} description="Average occupied bin volume" />
        <StatCard title="Open Orders" value={kpis?.openOrders} icon={ShoppingCart} description="Orders waiting for fulfillment" />
        <StatCard title="Pending Picks" value={kpis?.pendingPicks} icon={ScanLine} description="Tasks still on the floor" />
        <StatCard title="Shipped Today" value={kpis?.shippedToday ?? kpis?.itemsShippedToday} icon={Ship} description="Units dispatched today" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="glass-card rounded-3xl py-5">
          <CardHeader className="border-b border-border/60 pb-4">
            <div>
              <CardTitle>Daily Shipments</CardTitle>
              <CardDescription>Shipped units over the last seven days.</CardDescription>
            </div>
            <CardAction className="text-xs text-muted-foreground">Auto-refresh every 30s</CardAction>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={shipments} margin={{ left: -20, right: 6, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="shipment-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--wms-ship))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--wms-ship))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Shipped" stroke="hsl(var(--wms-ship))" strokeWidth={2.5} fill="url(#shipment-gradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-3xl py-5">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle>Inventory State Distribution</CardTitle>
            <CardDescription>Current inventory mix across the warehouse.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={inventoryByState} dataKey="count" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
                  {inventoryByState.map((entry) => (
                    <Cell key={entry.name} fill={STATE_COLORS[entry.name] || 'hsl(var(--primary))'} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {secondaryStats.map((stat) => (
          <Card key={stat.label} className="glass-card rounded-3xl py-5">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-sm">{stat.label}</CardTitle>
                <CardDescription>Current ops pulse</CardDescription>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                <stat.icon className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card rounded-3xl py-5">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle>Inventory by State</CardTitle>
          <CardDescription>Bar view for quick state comparison.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={inventoryByState} margin={{ left: -10, right: 6, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {inventoryByState.map((entry) => (
                  <Cell key={entry.name} fill={STATE_COLORS[entry.name] || 'hsl(var(--primary))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
