'use client';

import * as React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Columns3,
  Search,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/* ── Types ───────────────────────────────────────────── */

export interface ColumnDef<T = Record<string, unknown>> {
  /** Unique key — corresponds to the data row field */
  key: keyof T & string;
  /** Column header text */
  header: string;
  /** Custom cell renderer — defaults to `String(row[key])` */
  cell?: (row: T, value: unknown) => React.ReactNode;
  /** Allow sorting on this column (default: true) */
  sortable?: boolean;
  /** Hide column initially (can be toggled via column visibility) */
  hidden?: boolean;
  /** Min width in px */
  minWidth?: number;
}

type Density = 'compact' | 'default' | 'comfortable';
type SortDir = 'asc' | 'desc';

interface SortState {
  key:  string;
  dir:  SortDir;
}

export interface DataTableProps<T = Record<string, unknown>> {
  /** Row data */
  data:  T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Field used as unique React key — must be unique per row */
  keyField: keyof T & string;
  /** Called when user clicks a row */
  onRowClick?: (row: T) => void;
  /** Enable checkbox row selection */
  selectable?: boolean;
  /** Render bulk-action toolbar when rows are selected */
  bulkActions?: (selectedRows: T[], clearSelection: () => void) => React.ReactNode;
  /** Show global search bar above table (default: true) */
  globalFilter?: boolean;
  /** Show CSV export button (default: true) */
  exportCsv?: boolean;
  /** Filename for the CSV export (without extension) */
  exportFilename?: string;
  /** Initial row density */
  density?: Density;
  /** Accessible caption for the table */
  caption?: string;
  /** Custom empty state element */
  emptyState?: React.ReactNode;
  /** Extra class on the root wrapper */
  className?: string;
}

/* ── Helpers ─────────────────────────────────────────── */

function getValueRaw<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function cellText<T>(row: T, col: ColumnDef<T>): string {
  const v = getValueRaw(row, col.key);
  return String(v ?? '');
}

function exportToCSV<T>(
  data:     T[],
  columns:  ColumnDef<T>[],
  filename: string
) {
  const visible = columns.filter((c) => !c.hidden);
  const BOM     = '\uFEFF';
  const headers = visible.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const rows    = data.map((row) =>
    visible.map((c) => {
      const v = String(getValueRaw(row, c.key) ?? '').replace(/"/g, '""');
      return `"${v}"`;
    }).join(',')
  );
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
}

function sortData<T>(data: T[], sorts: SortState[]): T[] {
  if (!sorts.length) return data;
  return [...data].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const av = String(getValueRaw(a, key) ?? '');
      const bv = String(getValueRaw(b, key) ?? '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

const DENSITY_ROW_CLASS: Record<Density, string> = {
  compact:     'py-1',
  default:     'py-2.5',
  comfortable: 'py-4',
};

/* ── Component ───────────────────────────────────────── */

/**
 * Enterprise DataTable with:
 * - Multi-column sort (Shift+click for secondary sorts)
 * - Row selection + bulk-action toolbar
 * - Column visibility toggle
 * - Global search / filter
 * - CSV export
 * - Density toggle (compact / default / comfortable)
 * - Sticky header
 */
export function DataTable<T = Record<string, unknown>>({
  data,
  columns: columnsProp,
  keyField,
  onRowClick,
  selectable = false,
  bulkActions,
  globalFilter = true,
  exportCsv = true,
  exportFilename = 'export',
  density: densityProp = 'default',
  caption,
  emptyState,
  className,
}: DataTableProps<T>) {
  /* ── State ── */
  const [sorts,      setSorts]    = React.useState<SortState[]>([]);
  const [query,      setQuery]    = React.useState('');
  const [selected,   setSelected] = React.useState<Set<string>>(new Set());
  const [density,    setDensity]  = React.useState<Density>(densityProp);
  const [colVis,     setColVis]   = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(columnsProp.map((c) => [c.key, !c.hidden]))
  );
  const [colVisOpen, setColVisOpen] = React.useState(false);

  const columns = columnsProp.filter((c) => colVis[c.key] ?? !c.hidden);

  /* ── Filter ── */
  const filtered = React.useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columnsProp.some((col) => cellText(row, col).toLowerCase().includes(q))
    );
  }, [data, query, columnsProp]);

  /* ── Sort ── */
  const sorted = React.useMemo(() => sortData(filtered, sorts), [filtered, sorts]);

  /* ── Selection helpers ── */
  const allKeys    = sorted.map((r) => String(getValueRaw(r, keyField)));
  const allChecked = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someChecked = !allChecked && allKeys.some((k) => selected.has(k));

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allKeys));
  }
  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  const selectedRows = sorted.filter((r) => selected.has(String(getValueRaw(r, keyField))));

  /* ── Sort handler ── */
  function handleSort(key: string, shiftKey: boolean) {
    setSorts((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (!shiftKey) {
        if (existing?.dir === 'asc') return [{ key, dir: 'desc' }];
        if (existing?.dir === 'desc') return [];
        return [{ key, dir: 'asc' }];
      }
      /* Shift = multi-sort */
      if (existing) {
        if (existing.dir === 'asc') return prev.map((s) => s.key === key ? { ...s, dir: 'desc' as SortDir } : s);
        return prev.filter((s) => s.key !== key);
      }
      return [...prev, { key, dir: 'asc' }];
    });
  }

  function sortIcon(key: string) {
    const s = sorts.find((x) => x.key === key);
    if (!s) return <ChevronsUpDown className="ml-1 size-3 opacity-40" />;
    return s.dir === 'asc'
      ? <ChevronUp   className="ml-1 size-3 text-primary" />
      : <ChevronDown className="ml-1 size-3 text-primary" />;
  }

  function sortBadge(key: string) {
    if (sorts.length < 2) return null;
    const idx = sorts.findIndex((s) => s.key === key);
    if (idx < 0) return null;
    return (
      <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
        {idx + 1}
      </span>
    );
  }

  const rowCls = DENSITY_ROW_CLASS[density];

  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
        {/* Global search */}
        {globalFilter && (
          <div className="relative flex-1 min-w-36 max-w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 pl-8 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Density toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['compact', 'default', 'comfortable'] as Density[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                className={cn(
                  'px-2.5 py-1 text-[0.7rem] capitalize transition-colors',
                  density === d
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {d === 'comfortable' ? 'Comfy' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          {/* Column visibility */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setColVisOpen((v) => !v)}
            >
              <Columns3 className="size-3.5" /> Columns
            </Button>
            {colVisOpen && (
              <div className="animate-fade-in-up absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-border bg-popover shadow-lg py-1">
                {columnsProp.map((col) => (
                  <label
                    key={col.key}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-accent transition-colors"
                  >
                    <span className="shrink-0 text-primary">
                      {colVis[col.key]
                        ? <CheckSquare className="size-3.5" />
                        : <Square       className="size-3.5 text-muted-foreground" />
                      }
                    </span>
                    <input
                      type="checkbox"
                      checked={!!colVis[col.key]}
                      onChange={() => setColVis((v) => ({ ...v, [col.key]: !v[col.key] }))}
                      className="sr-only"
                    />
                    <span className="text-sm truncate">{col.header}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* CSV export */}
          {exportCsv && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => exportToCSV(sorted, columnsProp.filter((c) => colVis[c.key]), exportFilename)}
              disabled={sorted.length === 0}
            >
              <Download className="size-3.5" /> Export
            </Button>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectable && selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm animate-fade-in">
          <span className="font-medium text-primary">{selected.size} selected</span>
          {bulkActions(selectedRows, () => setSelected(new Set()))}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full caption-bottom text-sm">
          {caption && <caption className="mt-2 text-xs text-muted-foreground">{caption}</caption>}

          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
            <tr className="border-b border-border/60 bg-muted/30">
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Select all"
                  >
                    {allChecked
                      ? <CheckSquare className="size-4 text-primary" />
                      : someChecked
                      ? <CheckSquare className="size-4 text-primary/60" />
                      : <Square       className="size-4" />
                    }
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ minWidth: col.minWidth }}
                  onClick={(e) => col.sortable !== false && handleSort(col.key, e.shiftKey)}
                  className={cn(
                    'whitespace-nowrap px-3 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground',
                    rowCls,
                    col.sortable !== false && 'cursor-pointer select-none hover:text-foreground transition-colors'
                  )}
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable !== false && sortIcon(col.key)}
                    {sortBadge(col.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-40 text-center text-muted-foreground"
                >
                  {emptyState ?? (
                    <span className="text-sm">
                      {query ? `No results for "${query}"` : 'No data available'}
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const rowKey = String(getValueRaw(row, keyField));
                const isSelected = selected.has(rowKey);
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'border-b border-border/40 table-row-hover transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-primary/6'
                    )}
                  >
                    {selectable && (
                      <td
                        className={cn('w-10 px-3', rowCls)}
                        onClick={(e) => { e.stopPropagation(); toggleRow(rowKey); }}
                      >
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Select row"
                        >
                          {isSelected
                            ? <CheckSquare className="size-4 text-primary" />
                            : <Square       className="size-4" />
                          }
                        </button>
                      </td>
                    )}
                    {columns.map((col) => {
                      const raw = getValueRaw(row, col.key);
                      return (
                        <td
                          key={col.key}
                          className={cn('px-3 text-sm', rowCls)}
                        >
                          {col.cell ? col.cell(row, raw) : String(raw ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 text-[0.7rem] text-muted-foreground">
          <span>
            {query
              ? `${sorted.length} of ${data.length} rows`
              : `${sorted.length} row${sorted.length !== 1 ? 's' : ''}`
            }
          </span>
          {sorts.length > 0 && (
            <button
              type="button"
              className="text-xs hover:text-foreground transition-colors"
              onClick={() => setSorts([])}
            >
              Clear sort
            </button>
          )}
        </div>
      )}
    </div>
  );
}
