import * as React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Inline sparkline ───────────────────────────────── */

interface SparklineProps {
  data:   number[];
  color?: string;
  width?: number;
  height?: number;
}

function Sparkline({ data, color = 'currentColor', width = 64, height = 24 }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pts   = data.map((v, i): [number, number] => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * (height - 3) - 1.5,
  ]);
  const line = pts.reduce(
    (d, [x, y], i) => `${d}${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `,
    ''
  );
  const area = `${line}L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
      className="overflow-visible"
    >
      <path d={area}  fill={color} opacity="0.12" />
      <path d={line}  stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Types ───────────────────────────────────────────── */

export type KpiVariant = 'blue' | 'purple' | 'green' | 'amber' | 'cyan' | 'rose';

export interface KpiCardProps {
  /** Uppercase metric label */
  title: string;
  /** Current value */
  value: string | number;
  /** Unit appended after value, e.g. "%" or "kg" */
  valueSuffix?: string;
  /** Short description shown when there is no trend */
  description?: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Tailwind colour class for the icon, e.g. "text-blue-500" */
  accentClass?: string;
  /** Tailwind bg class for the icon container, e.g. "bg-blue-500/10" */
  iconBg?: string;
  /** Percentage delta vs previous period (positive = up, negative = down) */
  delta?: number;
  /** Human label for the comparison period, e.g. "vs last 7 days" */
  deltaLabel?: string;
  /** Series of numbers for the inline sparkline chart */
  trend?: number[];
  /** Gradient background variant */
  kpiVariant?: KpiVariant;
  /** Navigate to a detail page when clicked */
  href?: string;
  /** Extra class names on the card root */
  className?: string;
}

/**
 * Enterprise KPI card with optional sparkline, delta badge, icon, and hover-lift.
 *
 * Fully typed TypeScript version of StatCard, intended for TypeScript pages.
 *
 * @example
 * <KpiCard
 *   title="Pending Picks"
 *   value={42}
 *   delta={-8}
 *   deltaLabel="vs yesterday"
 *   trend={[55, 48, 60, 42, 50, 38, 42]}
 *   icon={ScanLine}
 *   kpiVariant="blue"
 *   accentClass="text-blue-500"
 *   iconBg="bg-blue-500/10"
 * />
 */
export function KpiCard({
  title,
  value,
  valueSuffix,
  description,
  icon: Icon,
  accentClass = 'text-primary',
  iconBg,
  delta,
  deltaLabel = 'vs yesterday',
  trend,
  kpiVariant,
  href,
  className,
}: KpiCardProps) {
  const hasDelta = delta !== undefined && delta !== null;
  const isUp     = hasDelta && delta! > 0;
  const isDn     = hasDelta && delta! < 0;
  const DeltaIcon = isUp ? TrendingUp : isDn ? TrendingDown : Minus;

  const sparkColor = isUp
    ? 'var(--wms-success, #16a34a)'
    : isDn
    ? 'var(--wms-danger, #dc2626)'
    : 'currentColor';

  const Wrapper = href ? 'a' : 'div';

  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        'glass-card card-hover rounded-[1.2rem] p-4 block',
        kpiVariant && `kpi-${kpiVariant}`,
        href && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* ── Left column ── */}
        <div className="min-w-0 flex-1">
          <p className="label-caps truncate">{title}</p>

          {/* Value */}
          <div className="mt-2 flex items-end gap-1.5 leading-none">
            <span className="text-[1.875rem] font-bold tracking-tight text-foreground">
              {value ?? '—'}
            </span>
            {valueSuffix && (
              <span className="mb-0.5 text-sm text-muted-foreground">{valueSuffix}</span>
            )}
          </div>

          {/* Delta badge */}
          {hasDelta ? (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-[0.75rem] font-medium',
                isUp ? 'trend-up' : isDn ? 'trend-down' : 'trend-flat'
              )}
            >
              <DeltaIcon className="size-3 shrink-0" />
              <span>
                {delta! > 0 ? '+' : ''}
                {delta}%
              </span>
              <span className="font-normal text-muted-foreground">{deltaLabel}</span>
            </div>
          ) : description ? (
            <p className="mt-2 text-[0.75rem] text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {/* ── Right column: icon + sparkline ── */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          {Icon && (
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl',
                iconBg ?? 'bg-primary/10'
              )}
            >
              <Icon className={cn('size-5', accentClass)} />
            </div>
          )}
          {trend && trend.length > 1 && (
            <div style={{ color: sparkColor }}>
              <Sparkline data={trend} color={sparkColor} />
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
