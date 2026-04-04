'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Layers3,
  Package,
  Warehouse,
  Boxes,
  ShoppingCart,
  ScanLine,
  PackageCheck,
  Ship,
  BarChart3,
  Users,
  ShieldCheck,
  Tag,
  Database,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Play,
  BookOpen,
  Zap,
  Lock,
  LayoutDashboard,
  Truck,
  ChevronUp,
  Star,
  Info,
  UserRound,
  Settings,
} from 'lucide-react';

/* ─── Static data ─────────────────────────────────────── */

const WORKFLOW_PHASES = [
  {
    id: 'inbound',
    phase: '01',
    title: 'Inbound & Receiving',
    color: 'blue',
    icon: Package,
    summary: 'Supplier goods arrive. Operator receives against a Purchase Order and creates a GRN.',
    steps: [
      { step: 'Open the Inbound page from the sidebar.' },
      { step: 'View all open Purchase Orders from your suppliers.' },
      { step: 'Select the matching PO and click Receive.' },
      { step: 'Enter received quantities per line item.' },
      { step: 'System auto-creates a Goods Receipt Note (GRN) and marks inventory as RECEIVED.' },
    ],
    tip: 'Partial receipts are supported — receive part of a PO and leave the rest open.',
  },
  {
    id: 'putaway',
    phase: '02',
    title: 'Putaway',
    color: 'green',
    icon: Warehouse,
    summary: 'System generates bin assignments. Operator scans item + bin barcodes to store stock.',
    steps: [
      { step: 'Go to the Putaway page after a GRN is created.' },
      { step: 'View auto-generated putaway tasks with suggested bin locations.' },
      { step: 'Pick up the physical item and walk to the suggested bin.' },
      { step: 'Scan the item barcode using the on-screen scanner.' },
      { step: 'Scan the bin barcode to confirm placement.' },
      { step: 'Task closes — inventory state moves to AVAILABLE.' },
    ],
    tip: 'The putaway engine selects bins based on SKU dimensions vs available bin capacity.',
  },
  {
    id: 'inventory',
    phase: '03',
    title: 'Inventory Management',
    color: 'amber',
    icon: Boxes,
    summary: 'Live bin-level stock visibility with multi-state tracking and manual adjustment.',
    steps: [
      { step: 'Open Inventory from the sidebar to see all stock.' },
      { step: 'Use search or filter by state (AVAILABLE, RESERVED, PICKED…).' },
      { step: 'Click any row to view bin location, batch, and serial number.' },
      { step: 'Use Adjust Stock (supervisor+) to correct quantities with a reason code.' },
    ],
    tip: 'Stock states update automatically as operations progress — no manual refresh needed.',
  },
  {
    id: 'orders',
    phase: '04',
    title: 'Sales Orders',
    color: 'purple',
    icon: ShoppingCart,
    summary: 'Create customer orders. System reserves stock and generates pick tasks instantly.',
    steps: [
      { step: 'Open Orders page and click New Order.' },
      { step: 'Enter customer name and add order lines (SKU + quantity).' },
      { step: 'System checks AVAILABLE stock and reserves it.' },
      { step: 'Pick tasks are auto-generated for each order line.' },
      { step: 'Order status moves to PICKING_IN_PROGRESS.' },
    ],
    tip: 'Only AVAILABLE stock can be ordered — reserved or in-putaway items are excluded.',
  },
  {
    id: 'trolleys',
    phase: '05',
    title: 'Trolley Assignment',
    color: 'indigo',
    icon: Truck,
    summary: 'Assign trolley compartments to orders so pickers can sort items on the warehouse floor.',
    steps: [
      { step: 'Open Trolleys from the sidebar.' },
      { step: 'Select a trolley and choose an available compartment.' },
      { step: 'Assign that compartment to a specific sales order.' },
      { step: 'Each compartment is dedicated to one order — no mixing.' },
    ],
    tip: 'One trolley can carry multiple orders across different compartments simultaneously.',
  },
  {
    id: 'picking',
    phase: '06',
    title: 'Picking',
    color: 'rose',
    icon: ScanLine,
    summary: 'Picker follows task list to bins, scans each item, and loads onto the assigned trolley.',
    steps: [
      { step: 'Open Picking and start a session for a sales order.' },
      { step: 'System shows you the task list: bin location → SKU → quantity.' },
      { step: 'Walk to the bin and scan the item barcode.' },
      { step: 'System confirms it matches the required SKU.' },
      { step: 'Place item in assigned trolley compartment. Repeat for all tasks.' },
      { step: 'When all tasks are done, order status → PICKED.' },
    ],
    tip: 'Wrong scan = instant alert. System prevents picking wrong items before they leave the bin.',
  },
  {
    id: 'packing',
    phase: '07',
    title: 'Packing',
    color: 'teal',
    icon: PackageCheck,
    summary: 'Packer scans trolley at the packing station. System shows exactly what should be packed.',
    steps: [
      { step: 'Open Packing page at the packing station.' },
      { step: 'Scan the trolley barcode and then the specific compartment barcode.' },
      { step: 'System loads the packing manifest for that order.' },
      { step: 'Scan each item one by one as you pack into shipping box.' },
      { step: 'Progress bar shows how many items remain.' },
      { step: 'When all items are scanned → order status moves to PACKED.' },
    ],
    tip: 'Packing acts as a final quality gate — catches any picking errors before dispatch.',
  },
  {
    id: 'shipping',
    phase: '08',
    title: 'Shipping',
    color: 'slate',
    icon: Ship,
    summary: 'Confirm dispatch with carrier and tracking details. Inventory is removed from bins.',
    steps: [
      { step: 'Open Shipping page and find the PACKED order.' },
      { step: 'Enter carrier name and tracking number.' },
      { step: 'Click Confirm Shipment.' },
      { step: 'System creates a shipment record, marks inventory as SHIPPED, removes it from bins.' },
      { step: 'Order status → SHIPPED. Dashboard KPIs update.' },
    ],
    tip: 'A shipment notification event is triggered and logged in the live dashboard feed.',
  },
];

const MODULES = [
  { icon: LayoutDashboard, label: 'Dashboard',     color: 'blue',   desc: 'KPIs, charts, live event feed'              },
  { icon: Package,         label: 'Inbound',        color: 'sky',    desc: 'Receive POs and create GRNs'                },
  { icon: Warehouse,       label: 'Putaway',        color: 'green',  desc: 'Scan items into bin locations'              },
  { icon: Boxes,           label: 'Inventory',      color: 'amber',  desc: 'Live bin-level stock ledger'                },
  { icon: Database,        label: 'Master Data',    color: 'orange', desc: 'Warehouses, zones, aisles, racks, bins'     },
  { icon: ShoppingCart,    label: 'Orders',         color: 'purple', desc: 'Sales orders & pick task generation'        },
  { icon: Truck,           label: 'Trolleys',       color: 'indigo', desc: 'Trolley & compartment management'           },
  { icon: ScanLine,        label: 'Picking',        color: 'rose',   desc: 'Barcode-scan picking session'               },
  { icon: PackageCheck,    label: 'Packing',        color: 'teal',   desc: 'Verify & pack at packing station'           },
  { icon: Ship,            label: 'Shipping',       color: 'slate',  desc: 'Confirm dispatch & tracking'                },
  { icon: BarChart3,       label: 'Reports',        color: 'cyan',   desc: 'KPI reports & Excel export'                 },
  { icon: Tag,             label: 'Labels',         color: 'lime',   desc: 'Print barcode labels for bins & SKUs'       },
  { icon: Users,           label: 'Users',          color: 'violet', desc: 'Create and manage user accounts'            },
  { icon: ShieldCheck,     label: 'Roles',          color: 'pink',   desc: 'Define roles and assign permissions'        },
  { icon: Settings,        label: 'Settings',       color: 'gray',   desc: 'System configuration & preferences'        },
];

const ROLES = [
  { role: 'Admin',             color: 'red',    access: ['All modules', 'User management', 'Role management', 'Master data', 'All reports'] },
  { role: 'Warehouse Manager', color: 'purple', access: ['Dashboard', 'Inbound & GRN', 'Inventory', 'Orders', 'Reports'] },
  { role: 'Supervisor',        color: 'blue',   access: ['All operations', 'Inventory adjust', 'Shipping confirm'] },
  { role: 'Picker',            color: 'green',  access: ['Picking module', 'Trolleys view'] },
  { role: 'Packer',            color: 'teal',   access: ['Packing module only'] },
  { role: 'Receiver',          color: 'amber',  access: ['Inbound & GRN', 'Putaway execution'] },
];

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', user: 'superadmin', pass: 'superadmin123', color: 'red'    },
  { role: 'Admin',       user: 'admin',      pass: 'admin123',      color: 'orange' },
  { role: 'Manager',     user: 'manager',    pass: 'manager123',    color: 'blue'   },
  { role: 'Worker',      user: 'worker',     pass: 'worker123',     color: 'green'  },
];

const SYSTEM_LAYERS = [
  {
    icon: Users,
    title: 'Warehouse Users',
    text: 'Admin, manager, receiver, picker, packer, supervisor',
    color: 'blue',
  },
  {
    icon: LayoutDashboard,
    title: 'Frontend Portal',
    text: 'Next.js screens for login, dashboard, operations, reports, and settings',
    color: 'purple',
  },
  {
    icon: ShieldCheck,
    title: 'Secure API Layer',
    text: 'Spring Boot REST APIs protected with JWT authentication and role permissions',
    color: 'green',
  },
  {
    icon: Database,
    title: 'WMS Database',
    text: 'Stores master data, inventory, orders, tasks, users, and shipment history',
    color: 'amber',
  },
];

const PROJECT_FLOW = [
  {
    icon: Package,
    title: 'Inbound Receive',
    text: 'Supplier goods are received against a purchase order and a GRN is created.',
    color: 'blue',
  },
  {
    icon: Warehouse,
    title: 'Putaway to Bin',
    text: 'System creates putaway tasks and operator scans item plus bin barcode.',
    color: 'green',
  },
  {
    icon: Boxes,
    title: 'Inventory Available',
    text: 'Stock becomes available with live bin-level visibility and state tracking.',
    color: 'amber',
  },
  {
    icon: ShoppingCart,
    title: 'Order Creation',
    text: 'Customer order reserves stock and generates pick tasks automatically.',
    color: 'purple',
  },
  {
    icon: Truck,
    title: 'Trolley Assignment',
    text: 'Order is assigned to a trolley compartment for floor execution.',
    color: 'indigo',
  },
  {
    icon: ScanLine,
    title: 'Picking Scan',
    text: 'Picker scans required items from the correct bins into the trolley.',
    color: 'rose',
  },
  {
    icon: PackageCheck,
    title: 'Packing Verify',
    text: 'Packer scans trolley and items again to confirm accuracy before dispatch.',
    color: 'teal',
  },
  {
    icon: Ship,
    title: 'Shipping Confirm',
    text: 'Shipment is confirmed with tracking details and inventory moves to shipped.',
    color: 'slate',
  },
];

/* ─── Color maps ────────────────────────────────────────── */
const PHASE_COLORS = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-300',   num: 'bg-blue-500'   },
  green:  { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  badge: 'bg-green-500/20 text-green-300', num: 'bg-green-500'  },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  badge: 'bg-amber-500/20 text-amber-300', num: 'bg-amber-500'  },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', num: 'bg-purple-500' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300', num: 'bg-indigo-500' },
  rose:   { bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   text: 'text-rose-400',   badge: 'bg-rose-500/20 text-rose-300',   num: 'bg-rose-500'   },
  teal:   { bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   text: 'text-teal-400',   badge: 'bg-teal-500/20 text-teal-300',   num: 'bg-teal-500'   },
  slate:  { bg: 'bg-slate-500/10',  border: 'border-slate-500/30',  text: 'text-slate-400',  badge: 'bg-slate-500/20 text-slate-300', num: 'bg-slate-600'  },
  sky:    { bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    text: 'text-sky-400',    badge: 'bg-sky-500/20 text-sky-300',     num: 'bg-sky-500'    },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300', num: 'bg-orange-500' },
  cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   badge: 'bg-cyan-500/20 text-cyan-300',   num: 'bg-cyan-500'   },
  lime:   { bg: 'bg-lime-500/10',   border: 'border-lime-500/30',   text: 'text-lime-400',   badge: 'bg-lime-500/20 text-lime-300',   num: 'bg-lime-500'   },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300', num: 'bg-violet-500'},
  pink:   { bg: 'bg-pink-500/10',   border: 'border-pink-500/30',   text: 'text-pink-400',   badge: 'bg-pink-500/20 text-pink-300',   num: 'bg-pink-500'   },
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    badge: 'bg-red-500/20 text-red-300',     num: 'bg-red-500'    },
  gray:   { bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   text: 'text-gray-400',   badge: 'bg-gray-500/20 text-gray-300',   num: 'bg-gray-500'   },
};

/* ─── Sub-components ────────────────────────────────────── */

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{children}</h2>
      {sub && <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">{sub}</p>}
    </div>
  );
}

function PhaseCard({ phase, isOpen, onToggle }) {
  const c = PHASE_COLORS[phase.color] ?? PHASE_COLORS.blue;
  const Icon = phase.icon;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden transition-all`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        {/* Phase number */}
        <span className={`shrink-0 flex size-10 items-center justify-center rounded-xl ${c.num} text-white font-bold text-sm`}>
          {phase.phase}
        </span>
        {/* Icon */}
        <span className={`shrink-0 flex size-9 items-center justify-center rounded-xl bg-background/60 border border-border/60`}>
          <Icon className={`size-4 ${c.text}`} />
        </span>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-base leading-tight">{phase.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{phase.summary}</p>
        </div>
        {/* Toggle icon */}
        {isOpen
          ? <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-border/40">
          <ol className="space-y-2.5 mt-3">
            {phase.steps.map((s, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className={`shrink-0 size-5 rounded-full ${c.num} text-white text-[10px] font-bold flex items-center justify-center mt-0.5`}>
                  {i + 1}
                </span>
                <span className="text-sm text-foreground/90 leading-relaxed">{s.step}</span>
              </li>
            ))}
          </ol>
          {phase.tip && (
            <div className={`mt-4 flex gap-2 rounded-xl ${c.bg} border ${c.border} px-4 py-3`}>
              <Star className={`size-3.5 ${c.text} shrink-0 mt-0.5`} />
              <p className={`text-xs ${c.text} leading-relaxed`}><span className="font-semibold">Pro tip: </span>{phase.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlowNode({ item, showArrow = false }) {
  const c = PHASE_COLORS[item.color] ?? PHASE_COLORS.blue;
  const Icon = item.icon;

  return (
    <>
      <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 md:p-5`}>
        <div className="flex items-start gap-3">
          <span className={`flex size-10 items-center justify-center rounded-xl ${c.num} text-white shadow-sm shrink-0`}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        </div>
      </div>
      {showArrow ? (
        <div className="hidden items-center justify-center md:flex">
          <ChevronRight className="size-5 text-muted-foreground/70" />
        </div>
      ) : null}
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */

export default function GuidePage() {
  const [openPhase, setOpenPhase] = useState('inbound');

  const toggle = (id) => setOpenPhase((prev) => (prev === id ? null : id));

  return (
    <div className="surface-grid min-h-screen">
      {/* ── Top Nav Bar ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
              <Layers3 className="size-4" />
            </span>
            <span className="font-bold text-foreground text-sm">WMS Pro</span>
            <span className="hidden sm:flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <BookOpen className="size-3" /> How to Use Guide
            </span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted hover:shadow"
          >
            <ArrowLeft className="size-3.5" />
            Back to Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">

        {/* ── Hero ── */}
        <section className="py-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-medium text-primary mb-5">
            <Zap className="size-3" />
            Complete Operator Guide — WMS Pro
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            How to Use<br />
            <span className="text-primary">WMS Pro</span>
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-sm text-muted-foreground leading-relaxed">
            This guide walks you through every module of the system — from receiving supplier goods
            to dispatching orders — with step-by-step instructions for each role.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#workflow"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition-opacity"
            >
              <Play className="size-3.5" /> Start Reading
            </a>
            <a
              href="#modules"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
            >
              <Boxes className="size-3.5" /> View All Modules
            </a>
          </div>
        </section>

        {/* ── Quick Start: Demo Accounts ── */}
        <section className="mb-14">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
              <span className="flex size-8 items-center justify-center rounded-xl bg-green-500/20">
                <UserRound className="size-4 text-green-400" />
              </span>
              <div>
                <p className="font-semibold text-foreground text-sm">Quick Start — Demo Accounts</p>
                <p className="text-xs text-muted-foreground">Use any of these credentials to log in and explore the system</p>
              </div>
            </div>
            <div className="grid gap-0 divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              {DEMO_ACCOUNTS.map((d) => {
                const c = PHASE_COLORS[d.color] ?? PHASE_COLORS.blue;
                return (
                  <Link
                    key={d.user}
                    href={`/login`}
                    className="group flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`size-8 flex items-center justify-center rounded-xl ${c.num} text-white text-xs font-bold shrink-0`}>
                        {d.role[0]}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{d.role}</p>
                        <p className="text-xs text-muted-foreground font-mono">{d.user} / {d.pass}</p>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── System Overview Cards ── */}
        <section className="mb-14">
          <SectionTitle sub="WMS Pro covers the complete warehouse lifecycle in one integrated platform.">
            System Overview
          </SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Package,      label: '18 Modules',           sub: 'End-to-end coverage',      color: 'blue'   },
              { icon: ScanLine,     label: 'Scan at every step',   sub: 'Barcode-verified accuracy', color: 'green'  },
              { icon: Lock,         label: 'JWT + RBAC Security',  sub: 'Role-gated API access',     color: 'purple' },
              { icon: BarChart3,    label: 'Live Dashboard',       sub: 'Real-time KPIs & charts',   color: 'amber'  },
            ].map((item) => {
              const Icon = item.icon;
              const c = PHASE_COLORS[item.color];
              return (
                <div key={item.label} className={`rounded-2xl border ${c.border} ${c.bg} p-5 text-center`}>
                  <span className={`inline-flex size-10 items-center justify-center rounded-xl ${c.num} text-white mx-auto mb-3`}>
                    <Icon className="size-5" />
                  </span>
                  <p className="font-bold text-foreground text-sm leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Project Flow Diagram ── */}
        <section className="mb-14">
          <SectionTitle sub="This diagram shows how the software is structured and how warehouse work moves from receiving to shipping.">
            Project Flow Diagram
          </SectionTitle>

          <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm sm:p-6">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">1. System Architecture Flow</p>
                  <p className="text-xs text-muted-foreground">Who uses the system and how data moves through the application stack.</p>
                </div>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  User → UI → API → DB
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
                {SYSTEM_LAYERS.map((item, index) => (
                  <FlowNode
                    key={item.title}
                    item={item}
                    showArrow={index < SYSTEM_LAYERS.length - 1}
                  />
                ))}
              </div>
            </div>

            <div className="my-5 h-px bg-border/70" />

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">2. Warehouse Operations Flow</p>
                  <p className="text-xs text-muted-foreground">The end-to-end business process followed by warehouse teams every day.</p>
                </div>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  Inbound → Putaway → Fulfillment → Dispatch
                </span>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {PROJECT_FLOW.map((item, index) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="mt-2 hidden h-full w-4 items-start justify-center lg:flex">
                      {index % 2 === 0 ? <ChevronRight className="size-4 text-muted-foreground/50" /> : null}
                    </span>
                    <div className="flex-1">
                      <FlowNode item={item} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Control</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Permissions drive every action</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Each page and API action is limited by role and permission codes such as inbound, picking, packing, and reports.</p>
                </div>
                <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">Accuracy</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Barcode scans validate movement</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Putaway, picking, and packing all use scan confirmation so the wrong item or location is blocked before stock changes.</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">Visibility</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Dashboard updates from live operations</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Once shipping is confirmed, KPIs, reports, stock states, and operational queues are updated from the same data source.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Inventory State Flow ── */}
        <section className="mb-14">
          <SectionTitle sub="Every stock item transitions through these states automatically as operations progress.">
            Inventory State Lifecycle
          </SectionTitle>
          <div className="rounded-2xl border border-border bg-card/60 p-5 overflow-x-auto">
            <div className="flex items-center justify-start gap-2 min-w-max mx-auto w-fit px-2">
              {[
                { label: 'RECEIVED',   bg: 'bg-blue-500/20',   text: 'text-blue-300',   icon: '📥', trigger: 'GRN Created' },
                { label: 'IN_PUTAWAY', bg: 'bg-amber-500/20',  text: 'text-amber-300',  icon: '🔄', trigger: 'Putaway Start' },
                { label: 'AVAILABLE',  bg: 'bg-green-500/20',  text: 'text-green-300',  icon: '✅', trigger: 'Putaway Done' },
                { label: 'RESERVED',   bg: 'bg-purple-500/20', text: 'text-purple-300', icon: '🔒', trigger: 'Order Created' },
                { label: 'PICKED',     bg: 'bg-rose-500/20',   text: 'text-rose-300',   icon: '📤', trigger: 'Pick Scan' },
                { label: 'PACKED',     bg: 'bg-teal-500/20',   text: 'text-teal-300',   icon: '📦', trigger: 'Pack Scan' },
                { label: 'SHIPPED',    bg: 'bg-slate-500/20',  text: 'text-slate-300',  icon: '🚚', trigger: 'Ship Confirm' },
              ].map((s, i, arr) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`flex flex-col items-center rounded-xl ${s.bg} px-4 py-2.5 min-w-22`}>
                      <span className="text-lg leading-none mb-1">{s.icon}</span>
                      <span className={`text-[10px] font-bold ${s.text} tracking-wide whitespace-nowrap`}>{s.label}</span>
                    </span>
                    <span className="text-[9px] text-muted-foreground text-center whitespace-nowrap">{s.trigger}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 mb-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Step by Step Workflow ── */}
        <section id="workflow" className="mb-14">
          <SectionTitle sub="Click each phase to expand the step-by-step instructions for that operation.">
            Step-by-Step Warehouse Workflow
          </SectionTitle>
          <div className="space-y-3">
            {WORKFLOW_PHASES.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                isOpen={openPhase === phase.id}
                onToggle={() => toggle(phase.id)}
              />
            ))}
          </div>
        </section>

        {/* ── All Modules ── */}
        <section id="modules" className="mb-14">
          <SectionTitle sub="Every page in the sidebar and its purpose.">
            All System Modules
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {MODULES.map((m) => {
              const Icon = m.icon;
              const c = PHASE_COLORS[m.color] ?? PHASE_COLORS.blue;
              return (
                <div
                  key={m.label}
                  className={`group rounded-2xl border ${c.border} ${c.bg} p-4 flex flex-col items-center text-center transition-all hover:shadow-sm`}
                >
                  <span className={`flex size-9 items-center justify-center rounded-xl ${c.num} text-white mb-3`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-[11px] font-bold text-foreground leading-tight mb-1">{m.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-snug">{m.desc}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Roles & Access ── */}
        <section className="mb-14">
          <SectionTitle sub="Each user is assigned a role. The role determines which modules and actions are accessible.">
            Roles &amp; Access Levels
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {ROLES.map((r) => {
              const c = PHASE_COLORS[r.color] ?? PHASE_COLORS.blue;
              return (
                <div key={r.role} className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className={`size-8 flex items-center justify-center rounded-xl ${c.num} text-white text-xs font-bold`}>
                      {r.role[0]}
                    </span>
                    <span className="font-bold text-foreground text-sm">{r.role}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {r.access.map((a) => (
                      <li key={a} className="flex items-center gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className={`size-3 ${c.text} shrink-0`} />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3.5 flex gap-3">
            <Info className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Roles are fully customisable by the Admin. New roles can be created and permission codes
              assigned per module (e.g. <code className="font-mono bg-black/20 px-1 rounded">PICKING_VIEW</code>,
              <code className="font-mono bg-black/20 px-1 rounded ml-1">ORDERS_CREATE</code>,
              <code className="font-mono bg-black/20 px-1 rounded ml-1">INVENTORY_ADJUST</code>).
            </p>
          </div>
        </section>

        {/* ── Admin First-Time Setup ── */}
        <section className="mb-14">
          <SectionTitle sub="Before operations can begin, an admin must set up the warehouse structure.">
            Admin First-Time Setup
          </SectionTitle>
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            {[
              { n: '1', title: 'Log in as Admin',            desc: 'Use the admin or superadmin demo account.',                                     color: 'blue'   },
              { n: '2', title: 'Create Warehouse',           desc: 'Go to Master Data → Warehouses and add your warehouse name and location.',       color: 'sky'    },
              { n: '3', title: 'Add Zones',                  desc: 'Create zones inside the warehouse (e.g., Zone-A, Cold Storage).',                color: 'green'  },
              { n: '4', title: 'Add Aisles & Racks',         desc: 'Add aisles per zone, then racks per aisle.',                                    color: 'amber'  },
              { n: '5', title: 'Register Bins',              desc: 'Add bins with unique barcodes and dimensions (used for volume-based putaway).',   color: 'orange' },
              { n: '6', title: 'Add SKUs',                   desc: 'Enter the product catalog with SKU codes and dimensions.',                       color: 'purple' },
              { n: '7', title: 'Create Users & Roles',       desc: 'Go to Roles → create roles → assign permission codes. Then create user accounts.', color: 'rose'  },
              { n: '8', title: 'Print Barcode Labels',       desc: 'Go to Labels to generate and print barcodes for bins, SKUs, and trolleys.',      color: 'teal'   },
            ].map((item) => {
              const c = PHASE_COLORS[item.color] ?? PHASE_COLORS.blue;
              return (
                <div key={item.n} className="flex items-start gap-4 px-5 py-4 border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                  <span className={`shrink-0 size-7 rounded-full ${c.num} text-white text-xs font-bold flex items-center justify-center mt-0.5`}>
                    {item.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ── */}
        <section>
          <div className="rounded-3xl border border-primary/20 bg-primary/10 px-6 py-10 text-center">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-5">
              <Layers3 className="size-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Ready to get started?</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Sign in with any demo account to explore WMS Pro. Start with the Admin account for full access.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition-opacity"
            >
              Go to Login <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}

