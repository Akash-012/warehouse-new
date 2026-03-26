'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { P } from '@/lib/permissions';
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  Warehouse,
  ShoppingCart,
  ScanLine,
  Boxes,
  Ship,
  Database,
  Settings,
  Moon,
  Sun,
  BarChart3,
  Tag,
  PackageCheck,
  Bell,
  LogOut,
  Users,
} from 'lucide-react';

const SIDEBAR_MIN       = 64;
const SIDEBAR_COLLAPSED = 64;
const SIDEBAR_DEFAULT   = 256;
const SIDEBAR_MAX       = 360;
const LS_KEY            = 'wms-sidebar-width';

const ALL_MENU_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, group: 'Overview',    permission: P.DASHBOARD_VIEW  },
  { href: '/inbound',     label: 'Inbound',     icon: Package,         group: 'Operations',  permission: P.INBOUND_VIEW    },
  { href: '/putaway',     label: 'Putaway',     icon: Warehouse,       group: 'Operations',  permission: P.PUTAWAY_VIEW    },
  { href: '/inventory',   label: 'Inventory',   icon: Boxes,           group: 'Operations',  permission: P.INVENTORY_VIEW  },
  { href: '/orders',      label: 'Orders',      icon: ShoppingCart,    group: 'Fulfillment', permission: P.ORDERS_VIEW     },
  { href: '/picking',     label: 'Picking',     icon: ScanLine,        group: 'Fulfillment', permission: P.PICKING_VIEW,   liveKey: 'pendingPicks' },
  { href: '/trolleys',    label: 'Trolleys',    icon: Truck,           group: 'Fulfillment', permission: P.TROLLEYS_VIEW   },
  { href: '/packing',     label: 'Packing',     icon: PackageCheck,    group: 'Fulfillment', permission: P.PACKING_VIEW    },
  { href: '/shipping',    label: 'Shipping',    icon: Ship,            group: 'Fulfillment', permission: P.SHIPPING_VIEW   },
  { href: '/master/bins', label: 'Master Data', icon: Database,        group: 'Admin',       permission: P.MASTER_VIEW     },
  { href: '/reports',     label: 'Reports',     icon: BarChart3,       group: 'Admin',       permission: P.REPORTS_VIEW    },
  { href: '/labels',      label: 'Labels',      icon: Tag,             group: 'Admin',       permission: P.LABELS_VIEW     },
  { href: '/users',       label: 'Users',       icon: Users,           group: 'Admin',       permission: P.USERS_VIEW      },
  { href: '/settings',    label: 'Settings',    icon: Settings,        group: 'Admin',       permission: null              },
];

/* ── NavItem ─────────────────────────────────────────── */
function NavItem({ item, isCollapsed, liveValue }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  const content = (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-all duration-100',
        active
          ? 'bg-sidebar-primary/18 text-sidebar-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-sidebar-primary'
          : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <item.icon className={cn('size-4 shrink-0', active && 'opacity-100')} />

      {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}

      {/* Count badge — expanded mode */}
      {!isCollapsed && liveValue > 0 && (
        <span className="ml-auto inline-flex min-w-4.5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground leading-none">
          {liveValue > 99 ? '99+' : liveValue}
        </span>
      )}

      {/* Count dot — collapsed mode */}
      {isCollapsed && liveValue > 0 && (
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-sidebar-primary animate-pulse" />
      )}
    </Link>
  );

  if (!isCollapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {item.label}
        {liveValue > 0 && (
          <span className="ml-2 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px]">
            {liveValue}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Sidebar ─────────────────────────────────────────── */
const Sidebar = () => {
  const [width, setWidth]           = useState(SIDEBAR_DEFAULT);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted]       = useState(false);
  const { theme, setTheme }         = useTheme();
  const router                      = useRouter();
  const dragStartX                  = useRef(0);
  const dragStartWidth              = useRef(0);
  const { can, username, role }     = usePermissions();

  const isCollapsed = width <= SIDEBAR_COLLAPSED + 10;

  // Filter menu items by permission
  const menuItems = ALL_MENU_ITEMS.filter((item) =>
    item.permission === null || can(item.permission)
  );

  /* Hydrate from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setWidth(Number(saved));
    } catch { /* noop */ }
    setMounted(true);
  }, []);

  /* Persist to localStorage */
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(LS_KEY, String(width)); } catch { /* noop */ }
  }, [width, mounted]);

  /* Live KPIs */
  const { data: kpis } = useQuery({
    queryKey: ['dashboardKpis-sidebar'],
    queryFn:  () => api.get('/dashboard/kpis').then((r) => r.data),
    retry:    false,
    refetchInterval: 20_000,
  });

  const groups = [...new Set(menuItems.map((i) => i.group))];

  /* ── Drag to resize ── */
  const onDragMouseDown = useCallback((e) => {
    e.preventDefault();
    dragStartX.current    = e.clientX;
    dragStartWidth.current = width;
    setIsDragging(true);
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e) => {
      const delta    = e.clientX - dragStartX.current;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidth.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const toggleCollapse = () => setWidth(isCollapsed ? SIDEBAR_DEFAULT : SIDEBAR_COLLAPSED);

  const handleLogout = () => {
    localStorage.removeItem('wms_token');
    localStorage.removeItem('wms_username');
    localStorage.removeItem('wms_role');
    localStorage.removeItem('wms_permissions');
    router.push('/login');
  };

  const pendingPicks = kpis?.pendingPicks ?? 0;
  const notifCount   = pendingPicks;

  const displayName = username ?? 'User';
  const displayRole = role ? role.replace('_', ' ') : '';

  return (
    <aside
      suppressHydrationWarning
      style={{ width }}
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar select-none overflow-hidden',
        !isDragging && 'transition-[width] duration-150 ease-out'
      )}
    >
      {/* ── Logo / brand header (Zoho-style, matches PageHeader h-14 = 56px) ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 transition-all duration-200">
        <div className={cn('flex items-center gap-3 overflow-hidden min-w-0', isCollapsed && 'justify-center')}>
          {/* Logo badge */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-blue-600 text-[13px] font-extrabold text-white shadow-md hover:shadow-lg transition-shadow">
            W
          </div>

          {/* Brand text — expanded only */}
          {!isCollapsed && (
            <div className="min-w-0 flex flex-col gap-0.5">
              <p className="truncate text-sm font-bold text-sidebar-foreground">WMS Pro</p>
              <p className="truncate text-xs text-sidebar-foreground/50">Warehouse</p>
            </div>
          )}
        </div>

        {/* Right side actions — expanded only */}
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="relative rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-200"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                  {notifCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {notifCount > 0 ? `${notifCount} pending picks` : 'No notifications'}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* ── Live queue card ── */}
      <div className="px-2.5 pt-3 pb-0">
        <div className={cn(
          'rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3',
          isCollapsed && 'flex items-center justify-center px-2 py-2.5'
        )}>
          {!isCollapsed ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/40">Live Queue</p>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <p className="text-[1.5rem] font-bold text-sidebar-foreground leading-none">{pendingPicks}</p>
                  <p className="mt-0.5 text-[11px] text-sidebar-foreground/55">pending picks</p>
                </div>
                <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </>
          ) : (
            <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="hide-scrollbar flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group}>
              {!isCollapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/35">
                  {group}
                </p>
              )}
              {isCollapsed && <div className="mx-3 my-1 h-px bg-sidebar-border/60" />}
              <div className="space-y-0.5">
                {menuItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      isCollapsed={isCollapsed}
                      liveValue={item.liveKey ? pendingPicks : 0}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Footer: user + theme ── */}
      <div className="shrink-0 border-t border-sidebar-border">
        {/* User row */}
        <div className={cn('flex items-center gap-2.5 px-3 py-2.5', isCollapsed && 'justify-center px-2')}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500/30 to-indigo-500/30 ring-1 ring-sidebar-border text-[11px] font-bold text-sidebar-primary">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.75rem] font-semibold text-sidebar-foreground">{displayName}</p>
              <p className="truncate text-[0.625rem] text-sidebar-foreground/40">{displayRole}</p>
            </div>
          )}
          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleLogout} className="rounded-md p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
                  <LogOut className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Theme toggle */}
        <div className="px-2.5 pb-2.5">
          <button
            suppressHydrationWarning
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8rem] text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
              isCollapsed && 'justify-center px-2'
            )}
          >
            {mounted
              ? theme === 'dark' ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />
              : <Moon className="size-4 shrink-0" />
            }
            {!isCollapsed && (
              <span>{mounted ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : 'Dark mode'}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Collapse / expand toggle pill ── */}
      <button
        suppressHydrationWarning
        onClick={toggleCollapse}
        className="absolute -right-3 top-18 z-10 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed
          ? <ChevronRight className="size-3.5" />
          : <ChevronLeft  className="size-3.5" />
        }
      </button>

      {/* ── Drag-to-resize handle ── */}
      <div
        onMouseDown={onDragMouseDown}
        className={cn(
          'absolute right-0 top-0 h-full w-1 cursor-col-resize z-20 transition-colors',
          isDragging ? 'bg-sidebar-primary/60' : 'hover:bg-sidebar-primary/30'
        )}
      />
    </aside>
  );
};

export default Sidebar;
