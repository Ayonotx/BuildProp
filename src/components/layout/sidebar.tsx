"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AI_ENABLED } from "@/lib/features"
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  MapPin,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Contact,
  FileText,
  CheckSquare,
  Calendar,
  BarChart3,
  Car,
  Shield,
  ShieldCheck,
  Settings,
  ChevronLeft,
  Briefcase,
  Landmark,
  Warehouse,
  Menu,
  X,
  HardHat,
  ClipboardList,
  MessageSquare,
  Bell,
  Scale,
  Building,
  Globe,
  Wrench,
  CreditCard,
  UserCircle,
  Brain,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  module: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban, module: "projects" },
      { label: "Properties", href: "/properties", icon: Building2, module: "properties" },
      { label: "Land Records", href: "/land", icon: MapPin, module: "land" },
      { label: "Sales", href: "/sales", icon: DollarSign, module: "sales" },
      { label: "CRM", href: "/crm", icon: Contact, module: "crm" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Accounting", href: "/finance", icon: Landmark, module: "finance" },
      { label: "Invoices", href: "/invoices", icon: FileText, module: "invoices" },
      { label: "Payments", href: "/payments", icon: CreditCard, module: "payments" },
      { label: "Installments", href: "/installments", icon: CreditCard, module: "installments" },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      { label: "Inventory", href: "/inventory", icon: Warehouse, module: "inventory" },
      { label: "Procurement", href: "/procurement", icon: ShoppingCart, module: "procurement" },
      { label: "Equipment", href: "/equipment", icon: Wrench, module: "equipment" },
      { label: "Assets", href: "/assets", icon: Briefcase, module: "assets" },
      { label: "Fleet", href: "/fleet", icon: Car, module: "fleet" },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { label: "HR & Payroll", href: "/hr", icon: Users, module: "hr" },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, module: "tasks" },
      { label: "Calendar", href: "/calendar", icon: Calendar, module: "calendar" },
    ],
  },
  ...(AI_ENABLED
    ? [
        {
          title: "INTELLIGENCE" as const,
          items: [
            { label: "AI & Automation", href: "/ai", icon: Brain, module: "ai" },
          ],
        },
      ]
    : []),
  {
    title: "SYSTEM",
    items: [
      { label: "Documents", href: "/documents", icon: ClipboardList, module: "documents" },
      { label: "Communication", href: "/communication", icon: MessageSquare, module: "communication" },
      { label: "Notifications", href: "/notifications", icon: Bell, module: "notifications" },
      { label: "Reports", href: "/reports", icon: BarChart3, module: "reports" },
      { label: "P&L Statement", href: "/reports/pnl", icon: BarChart3, module: "reports" },
      { label: "A/R Aging", href: "/reports/aging", icon: BarChart3, module: "reports" },
      { label: "Legal", href: "/legal", icon: Scale, module: "legal" },
      { label: "Branches", href: "/branches", icon: Building, module: "branches" },
      { label: "Integrations", href: "/integrations", icon: Globe, module: "integrations" },
      { label: "Website", href: "/website", icon: Globe, module: "website" },
      { label: "Customer Portal", href: "/portal", icon: UserCircle, module: "portal" },
      { label: "Audit Log", href: "/audit", icon: ShieldCheck, module: "audit" },
      { label: "Users", href: "/users", icon: Shield, module: "users" },
      { label: "Settings", href: "/settings", icon: Settings, module: "settings" },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

// Modules that map to real permissions in the DB (module.read gates access).
const PERMISSION_BACKED_MODULES = new Set([
  'projects',
  'properties',
  'documents',
  'inventory',
  'invoices',
  'payments',
  'reports',
  'employees',
])

function isAdminRoleName(roleName: string): boolean {
  return roleName === 'Super Admin' || roleName === 'Admin'
}

// Fail-open: anything we don't have a permission for stays visible. Settings
// and Users are admin-gated; everything else without granular permissions is
// shown to everyone.
function canSeeModule(module: string, perms: string[], roleName: string): boolean {
  if (module === 'users') return isAdminRoleName(roleName)
  if (module === 'settings') return isAdminRoleName(roleName) || perms.includes('settings.read')
  if (PERMISSION_BACKED_MODULES.has(module)) return perms.includes(`${module}.read`)
  return true
}

function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fetch the current user's permissions for RBAC. If the request fails we
  // leave state null and fail open (show the full navigation).
  const [access, setAccess] = useState<{ perms: string[]; roleName: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return
        setAccess({
          perms: Array.isArray(data.permissions) ? data.permissions : [],
          roleName: data.user?.role?.name || "",
        })
      })
      .catch(() => {
        // fail-open: keep access null so the full navigation is shown
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visibleNavigation = useMemo(() => {
    if (!access) return navigation
    const visible: NavGroup[] = []
    for (const group of navigation) {
      const items = group.items.filter((item) => canSeeModule(item.module, access.perms, access.roleName))
      if (items.length > 0) visible.push({ ...group, items })
    }
    return visible
  }, [access])

  const sidebarContent = (
    <div data-tutorial-sidebar className="flex h-full flex-col bg-[#431407] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-orange-900/60">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">BuildProp</span>
              {AI_ENABLED ? (
                <span className="block text-[10px] text-purple-400 -mt-1">Premium <span className="inline-flex items-center rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 ring-1 ring-inset ring-purple-500/30 ml-0.5">AI</span></span>
              ) : (
                <span className="block text-[10px] text-orange-200/60 -mt-1">Standard</span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-orange-200/60 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {visibleNavigation.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-orange-200/40">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item, idx) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tutorial-nav
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-orange-500/10 text-orange-400"
                        : "text-orange-100/60 hover:bg-orange-900/40 hover:text-white",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-orange-400")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:flex border-t border-orange-900/60 p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-orange-100/60 hover:bg-orange-900/40 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-[#431407] text-white shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col transition-all duration-200",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {sidebarContent}
      </div>
    </>
  )
}

export { Sidebar }
