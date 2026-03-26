import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  AVAILABLE:  { dot: 'bg-emerald-500', cls: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300' },
  RECEIVED:   { dot: 'bg-sky-500',     cls: 'bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-300' },
  IN_PUTAWAY: { dot: 'bg-amber-500',   cls: 'bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300' },
  RESERVED:   { dot: 'bg-violet-500',  cls: 'bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-300' },
  PICKED:     { dot: 'bg-fuchsia-500', cls: 'bg-fuchsia-500/12 text-fuchsia-700 ring-fuchsia-500/20 dark:text-fuchsia-300' },
  PACKED:     { dot: 'bg-teal-500',    cls: 'bg-teal-500/12 text-teal-700 ring-teal-500/20 dark:text-teal-300' },
  SHIPPED:    { dot: 'bg-cyan-500',    cls: 'bg-cyan-500/12 text-cyan-700 ring-cyan-500/20 dark:text-cyan-300' },
  FULL:       { dot: 'bg-rose-500',    cls: 'bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:text-rose-300' },
  BLOCKED:    { dot: 'bg-slate-500',   cls: 'bg-slate-500/12 text-slate-700 ring-slate-500/20 dark:text-slate-300' },
  OPEN:       { dot: 'bg-blue-500',    cls: 'bg-blue-500/12 text-blue-700 ring-blue-500/20 dark:text-blue-300' },
  PARTIAL:    { dot: 'bg-orange-500',  cls: 'bg-orange-500/12 text-orange-700 ring-orange-500/20 dark:text-orange-300' },
  CLOSED:     { dot: 'bg-zinc-500',    cls: 'bg-zinc-500/12 text-zinc-700 ring-zinc-500/20 dark:text-zinc-300' },
  PENDING:    { dot: 'bg-yellow-500',  cls: 'bg-yellow-500/12 text-yellow-700 ring-yellow-500/20 dark:text-yellow-300' },
  COMPLETED:  { dot: 'bg-emerald-500', cls: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300' },
  CANCELLED:  { dot: 'bg-red-500',     cls: 'bg-red-500/12 text-red-700 ring-red-500/20 dark:text-red-300' },
};

const PULSE_STATUSES = new Set(['IN_PUTAWAY', 'PENDING', 'OPEN', 'RESERVED', 'PICKED']);

function formatStatus(status) {
  return String(status || '')
    .toLowerCase()
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export default function StatusBadge({ status, className, showDot = true }) {
  const key = String(status || '').toUpperCase();
  const config = STATUS_CONFIG[key];
  const pulse = PULSE_STATUSES.has(key);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        config?.cls || 'bg-muted text-muted-foreground ring-border',
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'inline-block size-1.5 rounded-full shrink-0',
            config?.dot || 'bg-muted-foreground',
            pulse && 'animate-pulse'
          )}
        />
      )}
      {formatStatus(status || 'Unknown')}
    </span>
  );
}

