'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Enterprise page header with optional sticky compact mode, breadcrumbs, and badge.
 *
 * @param {object}   props
 * @param {string}   props.title
 * @param {string}   [props.description]
 * @param {Array<{label:string,href?:string}>} [props.breadcrumbs]
 * @param {React.ReactNode} [props.badge]     - pill badge rendered next to the title
 * @param {React.ReactNode} [props.actions]   - right-side CTA buttons / filters
 * @param {string}   [props.className]
 * @param {React.ReactNode} [props.children]  - extra right-side content
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  actions,
  className,
  children,
}) {
  const sentinelRef = useRef(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Intersection sentinel — triggers compact mode when scrolled past */}
      <div ref={sentinelRef} className="pointer-events-none absolute h-px w-px" />

      <div
        className={cn(
          'mb-6 transition-all duration-200',
          compact &&
            'sticky top-0 z-30 -mx-4 -mt-5 mb-4 border-b border-border/60 bg-background/95 px-4 py-3 shadow-sm backdrop-blur-md sm:-mx-6 sm:-mt-6 sm:px-6',
          className
        )}
      >
        {/* Breadcrumbs — hidden in compact mode */}
        {breadcrumbs?.length > 0 && !compact && (
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3 opacity-40" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground/60">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1
              className={cn(
                'truncate font-bold tracking-tight text-foreground transition-all duration-200',
                compact ? 'text-base' : 'text-[1.714rem]'
              )}
            >
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {/* Actions slot */}
          {(actions || children) && (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              {children}
            </div>
          )}
        </div>

        {/* Description — hidden in compact mode */}
        {description && !compact && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </>
  );
}
