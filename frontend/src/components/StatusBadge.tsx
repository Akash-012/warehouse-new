import { cn } from '@/lib/utils';

/**
 * Status / inventory-state configurations.
 * Uses the design-system --state-* CSS tokens for statuses that map to
 * inventory lifecycle states; falls back to Tailwind colour utilities for
 * all other statuses.
 */
const STATUS_CONFIG: Record<
  string,
  { dot: string; cls: string; pulse?: boolean }
> = {
  /* ── Inventory lifecycle ───────────────────────────── */
  RECEIVED: {
    dot: 'bg-violet-500',
    cls: 'bg-violet-500/10 text-violet-700 ring-violet-400/30 dark:text-violet-300 dark:bg-violet-500/15',
  },
  IN_PUTAWAY: {
    dot: 'bg-cyan-500',
    cls: 'bg-cyan-500/10 text-cyan-700 ring-cyan-400/30 dark:text-cyan-300 dark:bg-cyan-500/15',
    pulse: true,
  },
  AVAILABLE: {
    dot: 'bg-emerald-500',
    cls: 'bg-emerald-500/10 text-emerald-700 ring-emerald-400/30 dark:text-emerald-300 dark:bg-emerald-500/15',
  },
  RESERVED: {
    dot: 'bg-amber-500',
    cls: 'bg-amber-500/10 text-amber-700 ring-amber-400/30 dark:text-amber-300 dark:bg-amber-500/15',
    pulse: true,
  },
  PICKED: {
    dot: 'bg-blue-500',
    cls: 'bg-blue-500/10 text-blue-700 ring-blue-400/30 dark:text-blue-300 dark:bg-blue-500/15',
    pulse: true,
  },
  PACKED: {
    dot: 'bg-violet-500',
    cls: 'bg-violet-500/10 text-violet-700 ring-violet-400/30 dark:text-violet-300 dark:bg-violet-500/15',
  },
  SHIPPED: {
    dot: 'bg-slate-400',
    cls: 'bg-slate-500/10 text-slate-600 ring-slate-400/30 dark:text-slate-300 dark:bg-slate-500/15',
  },
  /* ── Order / PO states ─────────────────────────────── */
  PENDING: {
    dot: 'bg-yellow-500',
    cls: 'bg-yellow-500/10 text-yellow-700 ring-yellow-400/30 dark:text-yellow-300 dark:bg-yellow-500/15',
    pulse: true,
  },
  OPEN: {
    dot: 'bg-blue-500',
    cls: 'bg-blue-500/10 text-blue-700 ring-blue-400/30 dark:text-blue-300 dark:bg-blue-500/15',
    pulse: true,
  },
  PARTIAL: {
    dot: 'bg-orange-500',
    cls: 'bg-orange-500/10 text-orange-700 ring-orange-400/30 dark:text-orange-300 dark:bg-orange-500/15',
  },
  COMPLETED: {
    dot: 'bg-emerald-500',
    cls: 'bg-emerald-500/10 text-emerald-700 ring-emerald-400/30 dark:text-emerald-300 dark:bg-emerald-500/15',
  },
  CLOSED: {
    dot: 'bg-zinc-400',
    cls: 'bg-zinc-500/10 text-zinc-600 ring-zinc-400/30 dark:text-zinc-300 dark:bg-zinc-500/15',
  },
  CANCELLED: {
    dot: 'bg-red-500',
    cls: 'bg-red-500/10 text-red-700 ring-red-400/30 dark:text-red-300 dark:bg-red-500/15',
  },
  /* ── Bin states ────────────────────────────────────── */
  FULL: {
    dot: 'bg-rose-500',
    cls: 'bg-rose-500/10 text-rose-700 ring-rose-400/30 dark:text-rose-300 dark:bg-rose-500/15',
  },
  BLOCKED: {
    dot: 'bg-slate-500',
    cls: 'bg-slate-500/10 text-slate-600 ring-slate-400/30 dark:text-slate-300 dark:bg-slate-500/15',
  },
};

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  /** Raw status string, e.g. "AVAILABLE", "IN_PUTAWAY" */
  status?: string | null;
  /** Show coloured dot before label (default: true) */
  showDot?: boolean;
  /** Extra class names */
  className?: string;
}

/**
 * Pill badge for inventory, order, and bin lifecycle states.
 * Active states (IN_PUTAWAY, RESERVED, PICKED, PENDING, OPEN) animate
 * the indicator dot with a pulse.
 */
export default function StatusBadge({
  status,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const key    = String(status ?? '').toUpperCase();
  const config = STATUS_CONFIG[key];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ring-1 ring-inset whitespace-nowrap tracking-wide',
        config?.cls ?? 'bg-muted text-muted-foreground ring-border',
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'inline-block size-[5px] shrink-0 rounded-full',
            config?.dot ?? 'bg-muted-foreground',
            config?.pulse && 'animate-pulse'
          )}
        />
      )}
      {formatStatus(status ?? 'Unknown')}
    </span>
  );
}
