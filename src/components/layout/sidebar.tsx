"use client"

import React, { useState } from "react"
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
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Properties", href: "/properties", icon: Building2 },
      { label: "Land Records", href: "/land", icon: MapPin },
      { label: "Sales", href: "/sales", icon: DollarSign },
      { label: "CRM", href: "/crm", icon: Contact },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Accounting", href: "/finance", icon: Landmark },
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Installments", href: "/installments", icon: CreditCard },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      { label: "Inventory", href: "/inventory", icon: Warehouse },
      { label: "Procurement", href: "/procurement", icon: ShoppingCart },
      { label: "Equipment", href: "/equipment", icon: Wrench },
      { label: "Assets", href: "/assets", icon: Briefcase },
      { label: "Fleet", href: "/fleet", icon: Car },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { label: "HR & Payroll", href: "/hr", icon: Users },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  ...(AI_ENABLED
    ? [
        {
          title: "INTELLIGENCE" as const,
          items: [
            { label: "AI & Automation", href: "/ai", icon: Brain },
          ],
        },
      ]
    : []),
  {
    title: "SYSTEM",
    items: [
      { label: "Documents", href: "/documents", icon: ClipboardList },
      { label: "Communication", href: "/communication", icon: MessageSquare },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "P&L Statement", href: "/reports/pnl", icon: BarChart3 },
      { label: "A/R Aging", href: "/reports/aging", icon: BarChart3 },
      { label: "Legal", href: "/legal", icon: Scale },
      { label: "Branches", href: "/branches", icon: Building },
      { label: "Integrations", href: "/integrations", icon: Globe },
      { label: "Website", href: "/website", icon: Globe },
      { label: "Customer Portal", href: "/portal", icon: UserCircle },
      { label: "Audit Log", href: "/audit", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <div data-tutorial-sidebar className="flex h-full flex-col bg-[#0f172a] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
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
                <span className="block text-[10px] text-slate-400 -mt-1">Standard</span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navigation.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
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
      <div className="hidden lg:flex border-t border-slate-700/50 p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
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
        className="fixed top-4 left-4 z-50 lg:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f172a] text-white shadow-lg"
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
