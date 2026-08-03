"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FolderKanban,
  DollarSign,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  FileText,
  Users,
  CreditCard,
  CheckSquare,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface KpiData {
  totalProjects: number
  activeProjects: number
  totalProperties: number
  availableProperties: number
  revenue: number
  outstanding: number
}

interface ProjectStatusItem {
  status: string
  count: number
}

interface RecentActivity {
  type: string
  id: string
  title: string
  status?: string
  amount?: number
  date: string
}

interface UpcomingTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string
  projectId: string
}

interface MonthlyRevenue {
  month: string
  amount: number
}

interface ProjectProfitability {
  id: string
  name: string
  status: string
  budgeted: number
  spent: number
  budget: number
  variance: number
  variancePercent: number
}

interface DashboardData {
  kpi: KpiData
  projectStatus: ProjectStatusItem[]
  recentActivities: RecentActivity[]
  upcomingTasks: UpcomingTask[]
  monthlyRevenue: MonthlyRevenue[]
  projectProfitability: ProjectProfitability[]
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
  if (diffHr > 0) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`
  return "Just now"
}

function formatMonth(monthKey: string): string {
  const [year, m] = monthKey.split("-")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return months[parseInt(m, 10) - 1]
}

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function priorityVariant(priority: string): "destructive" | "warning" | "secondary" {
  if (priority === "high") return "destructive"
  if (priority === "medium") return "warning"
  return "secondary"
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 bg-slate-200 rounded" />
        <div className="h-4 w-64 bg-slate-200 rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 h-16" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white h-80" />
        <div className="rounded-xl border border-slate-200 bg-white h-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white h-64" />
        <div className="rounded-xl border border-slate-200 bg-white h-64" />
        <div className="rounded-xl border border-slate-200 bg-white h-64" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/setup")
      .then(r => r.json())
      .then(json => {
        if (!json.configured) {
          router.replace("/setup")
        }
      })
      .catch(() => {
      })
  }, [router])

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900">Failed to load dashboard</h2>
        <p className="text-sm text-slate-500">{error || "Unknown error"}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const { kpi, projectStatus, recentActivities, upcomingTasks, monthlyRevenue, projectProfitability } = data

  const revenueChartData = monthlyRevenue.map((m) => ({
    month: formatMonth(m.month),
    revenue: m.amount,
  }))

  const pieStatusColors: Record<string, string> = {
    planning: "#9CA3AF",
    in_progress: "#4F46E5",
    on_hold: "#EAB308",
    completed: "#22C55E",
  }

  const projectStatusPieData = projectStatus.map((ps) => ({
    name: statusLabel(ps.status),
    value: ps.count,
    color: pieStatusColors[ps.status] || "#94A3B8",
  }))

  const kpiCards = [
    {
      title: "Total Projects",
      value: String(kpi.totalProjects),
      change: `${kpi.activeProjects} active`,
      trend: "up" as const,
      icon: FolderKanban,
      color: "bg-blue-500",
    },
    {
      title: "Revenue",
      value: formatCurrency(kpi.revenue),
      change: "Total received",
      trend: "up" as const,
      icon: DollarSign,
      color: "bg-emerald-500",
    },
    {
      title: "Properties",
      value: String(kpi.totalProperties),
      change: `${kpi.availableProperties} available`,
      trend: "up" as const,
      icon: Building2,
      color: "bg-orange-500",
    },
    {
      title: "Outstanding",
      value: formatCurrency(kpi.outstanding),
      change: "Unpaid invoices",
      trend: "down" as const,
      icon: AlertTriangle,
      color: "bg-red-500",
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Welcome back! Here&apos;s what&apos;s happening with your projects today.</p>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {card.trend === "up" ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${card.trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
                        {card.change}
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-slate-500">Jump straight into your most common tasks</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "New Project", icon: FolderKanban, href: "/projects?new=1" },
              { label: "New Invoice", icon: FileText, href: "/invoices?new=1" },
              { label: "Add Task", icon: CheckSquare, href: "/tasks?new=1" },
              { label: "Add Contact", icon: Users, href: "/crm?new=1" },
              { label: "Record Payment", icon: CreditCard, href: "/payments?new=1" },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="flex items-center justify-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Status + Activity + Tasks — all equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Project Status — 2 cols */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Project Status</CardTitle>
              <a href="/projects" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                View All <ArrowUpRight className="h-3 w-3" />
              </a>
            </CardHeader>
            <CardContent>
              {projectStatus.length === 0 ? (
                <p className="text-sm text-slate-400">No projects found.</p>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={projectStatusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {projectStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} projects`, name]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 min-w-[140px]">
                    {projectStatusPieData.map((ps) => (
                      <div key={ps.name} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ps.color }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{ps.name}</p>
                          <p className="text-xs text-slate-500">{ps.value} projects</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity — 1 col */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activity</CardTitle>
            <a href="/notifications" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </a>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.slice(0, 6).map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-2 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    activity.type === "project" ? "bg-blue-500" :
                    activity.type === "payment" ? "bg-emerald-500" :
                    "bg-purple-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 truncate">
                      {activity.type === "payment"
                        ? `${activity.title}: ${formatCurrency(activity.amount ?? 0)}`
                        : `${statusLabel(activity.title)} — ${statusLabel(activity.status ?? "")}`
                      }
                    </p>
                    <p className="text-[11px] text-slate-400">{timeAgo(activity.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks — 1 col */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            <a href="/tasks" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </a>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingTasks.length === 0 && (
                <p className="text-sm text-slate-400">No upcoming tasks.</p>
              )}
              {upcomingTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    task.priority === "high" ? "bg-red-500" :
                    task.priority === "medium" ? "bg-amber-500" :
                    "bg-emerald-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{task.title}</p>
                  </div>
                  <Badge variant={priorityVariant(task.priority)} className="text-[10px] px-1.5 py-0">
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Profitability + Revenue — equal height, 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Project Profitability</CardTitle>
            <a href="/reports" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              Full Report <ArrowUpRight className="h-3 w-3" />
            </a>
          </CardHeader>
          <CardContent>
            {projectProfitability.length === 0 ? (
              <p className="text-sm text-slate-400">No projects found.</p>
            ) : (
              <div className="space-y-2">
                {projectProfitability.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(project.spent)} of {formatCurrency(project.budgeted)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                        project.variancePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {project.variancePercent >= 0 ? '+' : ''}{project.variancePercent}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue Overview</CardTitle>
            <Badge variant="secondary" className="text-xs">Last 6 Months</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                />
                <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
