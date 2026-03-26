import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline SVG sparkline from an array of numbers.
 * @param {{ data: number[], color?: string, fill?: boolean, width?: number, height?: number }} props
 */
function Sparkline({ data, color = 'currentColor', fill = true, width = 64, height = 24 }) {
  if (!data || data.length < 2) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pts   = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * (height - 2) - 1,
  ]);
  const line  = pts.reduce((d, [x, y], i) => `${d}${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `, '');
  const area  = `${line}L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className="overflow-visible"
      role="img"
      aria-label="Trend sparkline"
    >
      {fill && (
        <path d={area} fill={color} opacity="0.10" />
      )}
      <path d={line} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Enterprise KPI / stat card with optional sparkline, trend badge, and icon.
 *
 * @param {object}  props
 * @param {string}  props.title
 * @param {*}       props.value
 * @param {string}  [props.description]       - shown when no trend
 * @param {React.ElementType} [props.icon]
 * @param {string}  [props.accentClass]       - icon color class (default: 'text-primary')
 * @param {string}  [props.iconBg]            - icon bg class
 * @param {string}  [props.valueSuffix]       - appended after value, e.g. '%'
 * @param {number}  [props.trend]             - % delta vs last period (positive = up)
 * @param {string}  [props.trendLabel]        - e.g. "vs last week"
 * @param {number[]} [props.sparkline]        - series data for mini sparkline chart
 * @param {string}  [props.kpiVariant]        - 'blue'|'purple'|'green'|'amber'|'cyan'|'rose'
 * @param {string}  [props.className]
 */
export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accentClass = 'text-primary',
  iconBg,
  valueSuffix,
  trend,
  trendLabel = 'vs yesterday',
  sparkline,
  kpiVariant,
  className,
}) {
  const hasTrend = trend !== undefined && trend !== null;
  const trendUp  = hasTrend && trend > 0;
  const trendDn  = hasTrend && trend < 0;
  const TrendIcon = trendUp ? TrendingUp : trendDn ? TrendingDown : Minus;

  const sparkColor = trendUp
    ? 'var(--wms-success, #16a34a)'
    : trendDn
    ? 'var(--wms-danger, #dc2626)'
    : 'var(--muted-foreground, #64748b)';

  return (
    <div
      className={cn(
        'glass-card card-hover rounded-[1.2rem] p-4',
        kpiVariant && `kpi-${kpiVariant}`,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* ── Left: title + value + trend ── */}
        <div className="min-w-0 flex-1">
          <p className="label-caps truncate">{title}</p>

          <div className="mt-2 flex items-end gap-1.5 leading-none">
            <span className="text-[1.875rem] font-bold tracking-tight text-foreground">
              {value ?? '—'}
            </span>
            {valueSuffix && (
              <span className="pb-0.5 text-sm text-muted-foreground">{valueSuffix}</span>
            )}
          </div>

          {hasTrend ? (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-[0.75rem] font-medium',
                trendUp ? 'trend-up' : trendDn ? 'trend-down' : 'trend-flat'
              )}
            >
              <TrendIcon className="size-3 shrink-0" />
              <span>{trend > 0 ? '+' : ''}{trend}%</span>
              <span className="font-normal text-muted-foreground">{trendLabel}</span>
            </div>
          ) : description ? (
            <p className="mt-2 text-[0.75rem] text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {/* ── Right: icon + sparkline ── */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          {Icon && (
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl',
                iconBg || 'bg-primary/10'
              )}
            >
              <Icon className={cn('size-5', accentClass)} />
            </div>
          )}
          {sparkline && sparkline.length > 1 && (
            <div style={{ color: sparkColor }}>
              <Sparkline data={sparkline} color={sparkColor} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
