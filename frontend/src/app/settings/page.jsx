'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  User,
  Lock,
  Warehouse,
  Bell,
  Palette,
  Database,
  Shield,
  CheckCircle2,
  Server,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Info,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';

/* ── Section card with responsive icon + title ─────────── */
function Section({ icon: Icon, title, description, children, fullWidth }) {
  return (
    <div className={`glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
          {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      <Separator className="my-1" />
      {children}
    </div>
  );
}

/* ── Field row - responsive ────────────────────────────── */
function FieldRow({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <Label className="text-xs sm:text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ── Toggle row - responsive ──────────────────────────── */
function ToggleRow({ label, hint, checked, onCheckedChange }) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  /* ── Notification prefs (local state / localStorage) ── */
  const [notifPickAlert,    setNotifPickAlert]    = useState(true);
  const [notifOrderAlert,   setNotifOrderAlert]   = useState(true);
  const [notifLowStock,     setNotifLowStock]     = useState(false);
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(false);

  /* ── Password change state ─────────────────────────── */
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [pwSaving,    setPwSaving]    = useState(false);

  /* ── Warehouse form ────────────────────────────────── */
  const [whName,     setWhName]     = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [whEdited,   setWhEdited]   = useState(false);

  /* Load prefs from localStorage on mount */
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('wms_notif_prefs') || '{}');
      if (p.pickAlert    !== undefined) setNotifPickAlert(p.pickAlert);
      if (p.orderAlert   !== undefined) setNotifOrderAlert(p.orderAlert);
      if (p.lowStock     !== undefined) setNotifLowStock(p.lowStock);
      if (p.soundEnabled !== undefined) setNotifSoundEnabled(p.soundEnabled);
    } catch { /* ignore */ }
  }, []);

  const saveNotifPrefs = () => {
    localStorage.setItem('wms_notif_prefs', JSON.stringify({
      pickAlert: notifPickAlert,
      orderAlert: notifOrderAlert,
      lowStock: notifLowStock,
      soundEnabled: notifSoundEnabled,
    }));
    toast.success('Notification preferences saved');
  };

  /* ── Current user ──────────────────────────────────── */
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data).catch(() => {
      try {
        const token = localStorage.getItem('wms_token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { username: payload.sub, role: payload.role ?? 'USER' };
      } catch { return null; }
    }),
    staleTime: 300_000,
  });

  /* ── Warehouses ────────────────────────────────────── */
  const { data: warehouses, isLoading: whLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/master/warehouses').then((r) => r.data),
    staleTime: 60_000,
  });

  const primaryWarehouse = warehouses?.[0];

  useEffect(() => {
    if (primaryWarehouse && !whEdited) {
      setWhName(primaryWarehouse.name ?? '');
      setWhLocation(primaryWarehouse.location ?? '');
    }
  }, [primaryWarehouse, whEdited]);

  const whMutation = useMutation({
    mutationFn: (data) =>
      primaryWarehouse
        ? api.put(`/master/warehouses/${primaryWarehouse.id}`, data)
        : api.post('/master/warehouses', data),
    onSuccess: () => {
      toast.success('Warehouse settings saved');
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setWhEdited(false);
    },
    onError: () => toast.error('Failed to save warehouse settings'),
  });

  /* ── Password change ───────────────────────────────── */
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('New passwords do not match'); return; }
    if (newPw.length < 6)   { toast.error('Password must be at least 6 characters'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  /* ── API health ────────────────────────────────────── */
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/actuator/health').then((r) => r.data),
    staleTime: 30_000,
    retry: false,
  });

  const apiStatus = health?.status === 'UP' ? 'UP' : healthLoading ? 'Checking...' : 'DOWN';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your account, warehouse, and system preferences." />
      <Tabs defaultValue="account" className="w-full">
        {/* ── Responsive TabsList ──────────────────────────── */}
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full h-auto gap-1 sm:gap-2 p-1 mb-4 sm:mb-6">
          <TabsTrigger value="account" className="text-xs sm:text-sm"><User className="size-3 sm:size-3.5 mr-1 sm:mr-1.5" /><span className="hidden xs:inline">Account</span></TabsTrigger>
          <TabsTrigger value="warehouse" className="text-xs sm:text-sm"><Warehouse className="size-3 sm:size-3.5 mr-1 sm:mr-1.5" /><span className="hidden sm:inline">Warehouse</span></TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm"><Palette className="size-3 sm:size-3.5 mr-1 sm:mr-1.5" /><span className="hidden md:inline">Prefs</span></TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm"><Bell className="size-3 sm:size-3.5 mr-1 sm:mr-1.5" /><span className="hidden lg:inline">Notif</span></TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm"><Server className="size-3 sm:size-3.5 mr-1 sm:mr-1.5" /><span className="hidden lg:inline">System</span></TabsTrigger>
        </TabsList>

        {/* ── Account Tab ──────────────────────────────────── */}
        <TabsContent value="account" className="flex flex-col gap-4 sm:gap-6 mt-0">
          <Section icon={User} title="Profile" description="Your account information">
            {meLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full sm:w-48" />
                <Skeleton className="h-8 w-full sm:w-32" />
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:gap-6">
                <FieldRow label="Username">
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <Input value={me?.username ?? '—'} disabled className="font-mono text-xs sm:text-sm flex-1" />
                    <Badge variant="secondary" className="shrink-0 text-xs sm:text-sm">{me?.role ?? 'USER'}</Badge>
                  </div>
                </FieldRow>
                <FieldRow label="Role" hint="Contact admin to change role">
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/40 text-xs sm:text-sm text-muted-foreground">
                    <Shield className="size-3.5 sm:size-4" />
                    {me?.role ?? 'USER'}
                  </div>
                </FieldRow>
              </div>
            )}
          </Section>

          <Section icon={Lock} title="Change Password" description="Update your login password">
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 sm:gap-5">
              <FieldRow label="Current Password">
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-9 text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="size-3.5 sm:size-4" /> : <Eye className="size-3.5 sm:size-4" />}
                  </button>
                </div>
              </FieldRow>
              <FieldRow label="New Password">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 6 characters"
                  className="text-xs sm:text-sm"
                />
              </FieldRow>
              <FieldRow label="Confirm Password">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  className="text-xs sm:text-sm"
                />
              </FieldRow>
              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={pwSaving || !currentPw || !newPw || !confirmPw} className="text-xs sm:text-sm">
                  {pwSaving ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}
                  Update Password
                </Button>
              </div>
            </form>
          </Section>
        </TabsContent>

        {/* ── Warehouse Tab ────────────────────────────────── */}
        <TabsContent value="warehouse" className="flex flex-col gap-4 sm:gap-6 mt-0">
          <Section icon={Warehouse} title="Primary Warehouse" description="Configure your main warehouse location">
            {whLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:gap-5">
                <FieldRow label="Warehouse Name">
                  <Input
                    value={whName}
                    onChange={(e) => { setWhName(e.target.value); setWhEdited(true); }}
                    placeholder="e.g. Main Warehouse"
                    className="text-xs sm:text-sm"
                  />
                </FieldRow>
                <FieldRow label="Location / Address">
                  <Input
                    value={whLocation}
                    onChange={(e) => { setWhLocation(e.target.value); setWhEdited(true); }}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="text-xs sm:text-sm"
                  />
                </FieldRow>
                {warehouses?.length > 1 && (
                  <FieldRow label="All Warehouses" hint="Showing primary only">
                    <div className="flex flex-wrap gap-2">
                      {warehouses.map((w) => (
                        <Badge key={w.id} variant="outline" className="text-xs sm:text-sm">{w.name}</Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => whMutation.mutate({ name: whName, location: whLocation })}
                    disabled={whMutation.isPending || !whName}
                    className="text-xs sm:text-sm"
                  >
                    {whMutation.isPending
                      ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                      : <Save className="size-3.5 mr-1.5" />}
                    Save Warehouse
                  </Button>
                </div>
              </div>
            )}
          </Section>

          <Section icon={Database} title="Data & Storage" description="Database and migration information">
            <div className="flex flex-col gap-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Database</span>
                <span className="font-mono text-xs">MySQL · wms_db</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Migrations</span>
                <Badge variant="secondary" className="font-mono text-xs">Flyway · V5</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Connection Pool</span>
                <span className="font-mono text-xs">HikariCP · max 20</span>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── Preferences Tab ──────────────────────────────── */}
        <TabsContent value="preferences" className="flex flex-col gap-4 sm:gap-6 mt-0">
          <Section icon={Palette} title="Appearance" description="Customize the look and feel">
            <div className="flex flex-col gap-4">
              <p className="text-xs sm:text-sm font-medium">Theme</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map(({ value: t, label, icon: Icon }) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                      theme === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="size-3.5 sm:size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section icon={Info} title="Display" description="Table and pagination preferences">
            <div className="flex flex-col">
              <ToggleRow
                label="Compact tables"
                hint="Reduce row height for denser data display"
                checked={false}
                onCheckedChange={() => toast.info('Coming soon')}
              />
              <ToggleRow
                label="Auto-refresh queues"
                hint="Picking, packing, shipping queues refresh every 15 seconds"
                checked={true}
                onCheckedChange={() => toast.info('Managed per page')}
              />
            </div>
          </Section>
        </TabsContent>

        {/* ── Notifications Tab ────────────────────────────── */}
        <TabsContent value="notifications" className="flex flex-col gap-4 sm:gap-6 mt-0">
          <Section icon={Bell} title="Alerts" description="Choose which in-app notifications to show" fullWidth>
            <div className="flex flex-col">
              <ToggleRow
                label="Pending pick tasks"
                hint="Alert on dashboard when picks are waiting"
                checked={notifPickAlert}
                onCheckedChange={setNotifPickAlert}
              />
              <ToggleRow
                label="Open orders"
                hint="Alert on dashboard when orders need attention"
                checked={notifOrderAlert}
                onCheckedChange={setNotifOrderAlert}
              />
              <ToggleRow
                label="Low stock warnings"
                hint="Show alert when inventory quantity falls below threshold"
                checked={notifLowStock}
                onCheckedChange={setNotifLowStock}
              />
              <ToggleRow
                label="Sound on scan"
                hint="Play a beep when a barcode is successfully scanned"
                checked={notifSoundEnabled}
                onCheckedChange={setNotifSoundEnabled}
              />
            </div>
            <div className="flex justify-end pt-3 sm:pt-4 border-t border-border/50">
              <Button size="sm" onClick={saveNotifPrefs} className="text-xs sm:text-sm">
                <Save className="size-3.5 mr-1.5" /> Save Preferences
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* ── System Tab ───────────────────────────────────── */}
        <TabsContent value="system" className="flex flex-col gap-4 sm:gap-6 mt-0">
          <Section icon={Server} title="API & Backend" description="Connection and health status">
            <div className="flex flex-col gap-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">API Base URL</span>
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded truncate ml-2">http://localhost:8080/api</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Health Status</span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex size-2 rounded-full ${
                    apiStatus === 'UP' ? 'bg-emerald-500' :
                    apiStatus === 'DOWN' ? 'bg-red-500' :
                    'bg-amber-400 animate-pulse'
                  }`} />
                  <span className={`text-xs font-medium ${
                    apiStatus === 'UP' ? 'text-emerald-600' :
                    apiStatus === 'DOWN' ? 'text-red-600' :
                    'text-amber-600'
                  }`}>{apiStatus}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 ml-1" onClick={() => refetchHealth()}>
                    <RefreshCw className="size-3" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Authentication</span>
                <span className="font-mono text-xs">JWT · Bearer</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">API Docs</span>
                <a
                  href="http://localhost:8080/swagger-ui.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary hover:underline"
                >
                  Swagger UI →
                </a>
              </div>
            </div>
          </Section>

          <Section icon={Shield} title="Security" description="Authentication and session settings">
            <div className="flex flex-col gap-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">JWT Secret</span>
                <Badge variant="outline" className="font-mono text-xs">Configured</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Session Storage</span>
                <span className="font-mono text-xs">localStorage · wms_token</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Session</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('wms_token');
                    window.location.href = '/login';
                  }}
                  className="text-xs sm:text-sm"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </Section>

          <Section icon={Info} title="About" description="Application version and build info">
            <div className="flex flex-col gap-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Application</span>
                <span className="font-medium">WMS Pro</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Frontend</span>
                <span className="font-mono text-xs">Next.js 14 · React 18</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Backend</span>
                <span className="font-mono text-xs">Spring Boot 3 · Java 21</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Build Date</span>
                <span className="font-mono text-xs">2026-03-26</span>
              </div>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
