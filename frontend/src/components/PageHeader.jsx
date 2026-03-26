'use client';

import { cn } from '@/lib/utils';

/**
 * Simple Zoho-style page header — one header, no scroll duplication.
 */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 pb-5 border-b border-border/40', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-foreground leading-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}


/**
 * Zoho-style page header with sticky navigation.
 * Matches sidebar height (h-14 = 56px) for consistent visual alignment.
 *
 * @param {object}   props
 * @param {string}   props.title              - Main page heading
 * @param {string}   [props.description]      - Subtitle / page description
 * @param {Array<{label:string,href?:string}>} [props.breadcrumbs] - Navigation trail
 * @param {React.ReactNode} [props.actions]   - Right-side buttons (Export, Create, etc.)
 * @param {string}   [props.className]
 */
// export default function PageHeader({
//   title,
//   description,
//   breadcrumbs,
//   actions,
//   className,
// }) {
//   const sentinelRef = useRef(null);
//   const [isScrolled, setIsScrolled] = useState(false);

//   useEffect(() => {
//     const sentinel = sentinelRef.current;
//     if (!sentinel) return;
//     const observer = new IntersectionObserver(
//       ([entry]) => setIsScrolled(!entry.isIntersecting),
//       { threshold: 0, rootMargin: '0px 0px -100px 0px' }
//     );
//     observer.observe(sentinel);
//     return () => observer.disconnect();
//   }, []);

//   return (
//     <>
//       {/* Intersection sentinel */}
//       <div ref={sentinelRef} className="pointer-events-none h-px w-px" />

//       {/* ── Sticky Header (Zoho-style, always visible when scrolled) ────────────── */}
//       <div
//         className={cn(
//           'sticky top-0 z-40 h-14 flex items-center border-b bg-background/95 backdrop-blur-sm transition-all duration-200',
//           isScrolled ? 'border-border/60 shadow-sm' : 'border-border/30'
//         )}
//       >
//         <div className="flex-1 flex items-center gap-3 px-4 sm:px-6">
//           {/* Breadcrumb trail — left side, visible when scrolled */}
//           {isScrolled && breadcrumbs?.length > 0 && (
//             <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
//               {breadcrumbs.slice(0, 2).map((crumb, i) => (
//                 <span key={i} className="flex items-center gap-1.5">
//                   {i > 0 && <ChevronRight className="size-3 opacity-40" />}
//                   {crumb.href ? (
//                     <Link href={crumb.href} className="hover:text-foreground transition-colors">
//                       {crumb.label}
//                     </Link>
//                   ) : (
//                     <span className="font-medium text-foreground/70">{crumb.label}</span>
//                   )}
//                 </span>
//               ))}
//               {breadcrumbs?.length > 2 && <ChevronRight className="size-3 opacity-40" />}
//             </nav>
//           )}

//           {/* Title — compact when scrolled */}
//           <h1
//             className={cn(
//               'font-bold text-foreground truncate transition-all duration-200',
//               isScrolled ? 'text-sm' : 'text-base'
//             )}
//           >
//             {title}
//           </h1>
//         </div>

//         {/* Actions — right side, always visible */}
//         {actions && (
//           <div className="flex items-center gap-2 pr-4 sm:pr-6">
//             {actions}
//           </div>
//         )}
//       </div>

//       {/* ── Full header info (below sticky, shows when NOT scrolled) ───────────── */}
//       {!isScrolled && (
//         <div className={cn('px-4 sm:px-6 py-5 border-b border-border/40 bg-muted/20', className)}>
//           {/* Breadcrumbs */}
//           {breadcrumbs?.length > 0 && (
//             <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
//               {breadcrumbs.map((crumb, i) => (
//                 <span key={i} className="flex items-center gap-1.5">
//                   {i > 0 && <ChevronRight className="size-3.5 opacity-50" />}
//                   {crumb.href ? (
//                     <Link
//                       href={crumb.href}
//                       className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
//                     >
//                       {crumb.label}
//                     </Link>
//                   ) : (
//                     <span className="text-foreground/70 font-medium">{crumb.label}</span>
//                   )}
//                 </span>
//               ))}
//             </nav>
//           )}

//           {/* Title + Description + Actions */}
//           <div className="flex items-start justify-between gap-6">
//             <div className="flex-1 min-w-0">
//               <h1 className="text-2xl font-bold text-foreground">
//                 {title}
//               </h1>
//               {description && (
//                 <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
//                   {description}
//                 </p>
//               )}
//             </div>

//             {/* Actions — right side */}
//             {actions && (
//               <div className="flex shrink-0 items-center gap-2.5">
//                 {actions}
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
