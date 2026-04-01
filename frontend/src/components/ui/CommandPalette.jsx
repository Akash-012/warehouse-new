'use client';
import * as React from 'react';
import { ArrowRight, LayoutDashboard, Package, Warehouse, Boxes, ShoppingCart, ScanLine, Truck, PackageCheck, Ship, Database, BarChart3, Tag, Settings, Plus, Search, } from 'lucide-react';
import { cn } from '@/lib/utils';
function buildCommands(navigate) {
    const nav = (href) => () => navigate(href);
    return [
        /* Navigation */
        { id: 'nav-dashboard', label: 'Dashboard', sublabel: 'Overview & KPIs', icon: LayoutDashboard, group: 'Navigate', action: nav('/dashboard'), keywords: 'home overview kpis' },
        { id: 'nav-inbound', label: 'Inbound', sublabel: 'Receive purchase orders', icon: Package, group: 'Navigate', action: nav('/inbound'), keywords: 'receive po grn receipt' },
        { id: 'nav-putaway', label: 'Putaway', sublabel: 'Assign items to bins', icon: Warehouse, group: 'Navigate', action: nav('/putaway'), keywords: 'bin stock location' },
        { id: 'nav-inventory', label: 'Inventory', sublabel: 'Stock levels & movements', icon: Boxes, group: 'Navigate', action: nav('/inventory'), keywords: 'stock items sku batch' },
        { id: 'nav-orders', label: 'Orders', sublabel: 'Sales orders & dispatch', icon: ShoppingCart, group: 'Navigate', action: nav('/orders'), keywords: 'sales fulfilment' },
        { id: 'nav-picking', label: 'Picking', sublabel: 'Scan & pick items', icon: ScanLine, group: 'Navigate', action: nav('/picking'), keywords: 'scan pick wave' },
        { id: 'nav-trolleys', label: 'Trolleys', sublabel: 'Trolley management', icon: Truck, group: 'Navigate', action: nav('/trolleys'), keywords: 'trolley rack compartment' },
        { id: 'nav-packing', label: 'Packing', sublabel: 'Pack & label outbound', icon: PackageCheck, group: 'Navigate', action: nav('/packing'), keywords: 'pack label box' },
        { id: 'nav-shipping', label: 'Shipping', sublabel: 'Create shipments', icon: Ship, group: 'Navigate', action: nav('/shipping'), keywords: 'ship dispatch courier' },
        { id: 'nav-bins', label: 'Master Data', sublabel: 'Bins, SKUs & warehouses', icon: Database, group: 'Navigate', action: nav('/master/bins'), keywords: 'bins master sku warehouse' },
        { id: 'nav-reports', label: 'Reports', sublabel: 'Analytics & exports', icon: BarChart3, group: 'Navigate', action: nav('/reports'), keywords: 'analytics chart export csv' },
        { id: 'nav-labels', label: 'Labels', sublabel: 'Print barcode labels', icon: Tag, group: 'Navigate', action: nav('/labels'), keywords: 'barcode label print qr' },
        { id: 'nav-settings', label: 'Settings', sublabel: 'App configuration', icon: Settings, group: 'Navigate', action: nav('/settings'), keywords: 'config preferences' },
        /* Actions */
        { id: 'act-receive-po', label: 'Receive PO', sublabel: 'Create a new GRN', icon: Plus, group: 'Actions', action: () => navigate('/inbound?action=receive'), keywords: 'receive po grn create' },
        { id: 'act-new-order', label: 'New Order', sublabel: 'Create a sales order', icon: Plus, group: 'Actions', action: () => navigate('/orders?action=new'), keywords: 'create order sales' },
        { id: 'act-scan', label: 'Scan Barcode', sublabel: 'Open scan console', icon: ScanLine, group: 'Actions', action: () => navigate('/picking'), keywords: 'scan barcode item' },
    ];
}
/* ── Fuzzy match (no library needed) ────────────────── */
function fuzzyScore(query, target) {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (t === q)
        return 3;
    if (t.startsWith(q))
        return 2;
    if (t.includes(q))
        return 1;
    // character-in-order match
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi])
            qi++;
    }
    return qi === q.length ? 0.5 : 0;
}
/* ── Recent commands ─────────────────────────────────── */
const RECENT_KEY = 'wms-cmd-recent';
function loadRecent() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    }
    catch {
        return [];
    }
}
function addRecent(id) {
    try {
        const prev = loadRecent().filter((r) => r !== id);
        localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, 5)));
    }
    catch { /* noop */ }
}
/**
 * Cmd+K command palette. Supports:
 * - Fuzzy search across all commands + keywords
 * - Keyboard navigation (↑ ↓ Enter Esc)
 * - Recent commands (localStorage)
 * - Grouped results
 */
export function CommandPalette({ onNavigate }) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [cursor, setCursor] = React.useState(0);
    const inputRef = React.useRef(null);
    /* Build commands once */
    const navigate = React.useCallback((href) => {
        if (onNavigate) {
            onNavigate(href);
            return;
        }
        /* Fallback: use window.location for non-Next.js contexts */
        window.location.href = href;
    }, [onNavigate]);
    const commands = React.useMemo(() => buildCommands(navigate), [navigate]);
    /* ── Keyboard shortcut ── */
    React.useEffect(() => {
        const handler = (e) => {
            const isMac = navigator.platform.toLowerCase().includes('mac');
            if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
            if (e.key === 'Escape')
                setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    React.useEffect(() => {
        if (open) {
            setQuery('');
            setCursor(0);
            setTimeout(() => inputRef.current?.focus(), 20);
        }
    }, [open]);
    /* ── Filtered & ranked results ── */
    const results = React.useMemo(() => {
        if (!query.trim()) {
            /* Show recent commands first, then all */
            const recent = loadRecent();
            const recentCmds = recent
                .map((id) => commands.find((c) => c.id === id))
                .filter(Boolean);
            const rest = commands.filter((c) => !recent.includes(c.id));
            return [...recentCmds.map((c) => ({ ...c, group: 'Recent' })), ...rest];
        }
        return commands
            .map((c) => ({
            ...c,
            score: Math.max(fuzzyScore(query, c.label), fuzzyScore(query, c.keywords), fuzzyScore(query, c.sublabel ?? '')),
        }))
            .filter((c) => c.score > 0)
            .sort((a, b) => b.score - a.score);
    }, [query, commands]);
    /* ── Group results ── */
    const grouped = React.useMemo(() => {
        const map = new Map();
        results.forEach((c) => {
            const grp = map.get(c.group) ?? [];
            grp.push(c);
            map.set(c.group, grp);
        });
        return map;
    }, [results]);
    /* Flat list for cursor navigation */
    const flat = results;
    /* ── Keyboard navigation ── */
    function handleKeyDown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, flat.length - 1));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = flat[cursor];
            if (cmd)
                runCommand(cmd);
        }
        else if (e.key === 'Escape') {
            setOpen(false);
        }
    }
    function runCommand(cmd) {
        addRecent(cmd.id);
        cmd.action();
        setOpen(false);
    }
    if (!open)
        return null;
    return (
    /* Backdrop */
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] animate-fade-in" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onPointerDown={(e) => { if (e.target === e.currentTarget)
        setOpen(false); }} role="dialog" aria-modal aria-label="Command palette">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-xl animate-fade-in-up" onPointerDown={(e) => e.stopPropagation()}>
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground"/>
          <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setCursor(0); }} onKeyDown={handleKeyDown} placeholder="Search commands…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Command search"/>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto thin-scrollbar py-1">
          {results.length === 0 ? (<p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No commands found for &ldquo;{query}&rdquo;
            </p>) : (Array.from(grouped.entries()).map(([group, cmds]) => (<div key={group}>
                <p className="label-caps px-4 pt-3 pb-1">{group}</p>
                {cmds.map((cmd) => {
                const idx = flat.indexOf(cmd);
                const active = idx === cursor;
                return (<button key={cmd.id} type="button" onPointerDown={() => runCommand(cmd)} onPointerEnter={() => setCursor(idx)} className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors', active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50')}>
                      <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <cmd.icon className="size-4"/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{cmd.label}</p>
                        {cmd.sublabel && (<p className="truncate text-[0.7rem] text-muted-foreground">{cmd.sublabel}</p>)}
                      </div>
                      {active && <ArrowRight className="size-4 shrink-0 text-muted-foreground"/>}
                    </button>);
            })}
              </div>)))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2">
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([key, label]) => (<span key={key} className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">{key}</kbd>
              {label}
            </span>))}
        </div>
      </div>
    </div>);
}
/* ── Hook for easy integration ───────────────────────── */
/**
 * Renders CommandPalette globally. Add `<CommandPaletteProvider />` once
 * inside your layout, next to `<Toaster />`.
 */
export function CommandPaletteProvider() {
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
    // navigate via window.location — works without Next.js router in this context
    return <CommandPalette />;
}
