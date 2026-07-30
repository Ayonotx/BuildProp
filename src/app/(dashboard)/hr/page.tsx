"use client"

import React, { useEffect, useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Building2, UserCheck, UserX, Calendar, Clock, DollarSign, Printer, X } from "lucide-react"
import { formatDate, statusLabel, formatCurrency, formatDateTime } from "@/lib/utils"
import { calculateGhanaPayroll, type GhanaPayrollResult } from "@/lib/ghana-tax"
import { printDocument } from "@/lib/print"

interface Employee {
  id: string
  employeeId: string
  designation: string
  departmentName: string
  departmentId: string
  employmentType: string
  dateOfJoining: string
  salary: number
  status: string
  attendanceCount: number
}

interface Department {
  id: string
  name: string
  code: string
  employeeCount: number
}

interface LeaveRequest {
  id: string
  employeeName: string
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: string
}

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeDbId: string
  clockIn: string | null
  clockOut: string | null
  status: string
  hours: number
  date: string
}

interface AttendanceStats {
  presentToday: number
  absentToday: number
  lateToday: number
  avgHours: number
}

interface PayrollRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeDbId: string
  baseSalary: number
  allowances: number
  deductions: number
  netPay: number
  status: string
  paidDate: string | null
  periodStart: string
  periodEnd: string
}

interface PayrollPreviewRow {
  employeeId: string
  employeeName: string
  basicSalary: number
  result: GhanaPayrollResult
}

interface PayrollStats {
  totalPayroll: number
  avgSalary: number
  pendingPayments: number
}

const typeBadge = (t: string) => {
  if (t === "full_time") return "default"
  if (t === "part_time") return "warning"
  return "secondary"
}

const statusBadge = (s: string) => {
  if (s === "active" || s === "approved") return "success"
  if (s === "on_leave" || s === "pending") return "warning"
  if (s === "inactive" || s === "rejected") return "destructive"
  return "secondary"
}

const attendanceBadge = (s: string) => {
  if (s === "present") return "success"
  if (s === "late") return "warning"
  if (s === "absent") return "destructive"
  if (s === "half_day") return "secondary"
  return "secondary"
}

const fmtDate = (val: string | null) => val ? formatDate(val) : "—"
const fmtTime = (val: string | null) => {
  if (!val) return "—"
  return formatDateTime(val)
}

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({ presentToday: 0, absentToday: 0, lateToday: 0, avgHours: 0 })
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [payrollStats, setPayrollStats] = useState<PayrollStats>({ totalPayroll: 0, avgSalary: 0, pendingPayments: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"employees" | "departments" | "leaves" | "attendance" | "payroll">("employees")
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [empForm, setEmpForm] = useState({ designation: "", departmentId: "", employmentType: "full_time", salary: "" })
  const [leaveForm, setLeaveForm] = useState({ employeeId: "", leaveType: "annual", startDate: "", endDate: "", days: "1", reason: "" })
  const [attendanceForm, setAttendanceForm] = useState({ employeeId: "", status: "present", clockIn: "09:00", clockOut: "" })
  const [payrollPreview, setPayrollPreview] = useState<PayrollPreviewRow[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [payslipRecord, setPayslipRecord] = useState<PayrollPreviewRow | null>(null)
  const [showPayslip, setShowPayslip] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const [hrRes, attRes, payRes] = await Promise.all([
        fetch("/api/hr"),
        fetch("/api/hr/attendance"),
        fetch("/api/hr/payroll"),
      ])
      const hrData = await hrRes.json()
      setEmployees(hrData.employees || [])
      setDepartments(hrData.departments || [])
      setLeaveRequests(hrData.leaveRequests || [])

      const attData = await attRes.json()
      setAttendanceRecords(attData.records || [])
      setAttendanceStats(attData.stats || { presentToday: 0, absentToday: 0, lateToday: 0, avgHours: 0 })

      const payData = await payRes.json()
      setPayrollRecords(payData.records || [])
      setPayrollStats(payData.stats || { totalPayroll: 0, avgSalary: 0, pendingPayments: 0 })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function handleCreateEmployee() {
    setSaving(true)
    try {
      const res = await fetch("/api/hr/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...empForm,
          salary: empForm.salary ? Number(empForm.salary) : 0,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast("Employee created.")
      setShowEmpModal(false)
      setEmpForm({ designation: "", departmentId: "", employmentType: "full_time", salary: "" })
      fetchData()
    } catch {
      toast({ title: "Error creating employee", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateLeave() {
    setSaving(true)
    try {
      const res = await fetch("/api/hr/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leaveForm,
          days: Number(leaveForm.days) || 1,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast("Leave request created.")
      setShowLeaveModal(false)
      setLeaveForm({ employeeId: "", leaveType: "annual", startDate: "", endDate: "", days: "1", reason: "" })
      fetchData()
    } catch {
      toast({ title: "Error creating leave request", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleLeaveAction(id: string, status: string) {
    try {
      await fetch(`/api/hr/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      toast(`Leave ${status}.`)
      fetchData()
    } catch {
      toast({ title: "Error updating leave", variant: "error" })
    }
  }

  async function handleMarkAttendance() {
    setSaving(true)
    try {
      const now = new Date()
      const today = now.toISOString().split("T")[0]
      const clockInTime = attendanceForm.clockIn ? `${today}T${attendanceForm.clockIn}:00` : null
      const clockOutTime = attendanceForm.clockOut ? `${today}T${attendanceForm.clockOut}:00` : null

      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: attendanceForm.employeeId,
          status: attendanceForm.status,
          clockIn: clockInTime,
          clockOut: clockOutTime,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast("Attendance marked.")
      setShowAttendanceModal(false)
      setAttendanceForm({ employeeId: "", status: "present", clockIn: "09:00", clockOut: "" })
      fetchData()
    } catch {
      toast({ title: "Error marking attendance", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handlePreviewPayroll() {
    setSaving(true)
    try {
      const res = await fetch("/api/hr")
      const data = await res.json()
      const activeEmps = (data.employees || []).filter((e: Employee) => e.status === "active")
      if (activeEmps.length === 0) {
        toast({ title: "No active employees found", variant: "error" })
        return
      }
      const preview = activeEmps.map((emp: Employee) => ({
        employeeId: emp.employeeId,
        employeeName: emp.designation,
        basicSalary: emp.salary,
        result: calculateGhanaPayroll(emp.salary),
      }))
      setPayrollPreview(preview)
      setShowPreview(true)
    } catch {
      toast({ title: "Failed to load employees for preview", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmPayroll() {
    setSaving(true)
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast(data.message || "Payroll generated.")
      setShowPreview(false)
      setPayrollPreview([])
      fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error generating payroll"
      toast({ title: msg, variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  function handleViewPayslip(row: PayrollPreviewRow) {
    setPayslipRecord(row)
    setShowPayslip(true)
  }

  function handlePrintPayslip(row: PayrollPreviewRow) {
    const r = row.result
    const content = `
      <div class="section">
        <div class="section-label">Employee Details</div>
        <table>
          <tr><td><strong>Name:</strong></td><td>${row.employeeName}</td></tr>
          <tr><td><strong>Employee ID:</strong></td><td>${row.employeeId}</td></tr>
          <tr><td><strong>Period:</strong></td><td>${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</td></tr>
        </table>
      </div>
      <div class="section">
        <div class="section-label">Earnings</div>
        <table>
          <tr><td>Basic Salary</td><td class="text-right mono">${formatCurrency(r.basicSalary)}</td></tr>
        </table>
      </div>
      <div class="section">
        <div class="section-label">Employee Deductions</div>
        <table>
          <tr><td>SSNIT Tier 1 (13.5%)</td><td class="text-right mono">-${formatCurrency(r.employee.ssnitTier1)}</td></tr>
          <tr><td>GET Tier 2 (2.5%)</td><td class="text-right mono">-${formatCurrency(r.employee.getTier2)}</td></tr>
          <tr><td>NHIL (2.5%)</td><td class="text-right mono">-${formatCurrency(r.employee.nhil)}</td></tr>
          <tr><td>COVID-19 Health Levy (1%)</td><td class="text-right mono">-${formatCurrency(r.employee.covidLevy)}</td></tr>
          <tr><td>PAYE (Income Tax)</td><td class="text-right mono">-${formatCurrency(r.employee.paye)}</td></tr>
        </table>
        <div class="totals"><table class="totals-table">
          <tr><td>Total Deductions</td><td class="text-right mono"><strong>${formatCurrency(r.employee.totalDeductions)}</strong></td></tr>
        </table></div>
      </div>
      <div class="section">
        <div class="section-label">Net Pay</div>
        <div class="totals"><table class="totals-table">
          <tr class="total-row"><td>Net Pay</td><td class="text-right mono">${formatCurrency(r.employee.netPay)}</td></tr>
        </table></div>
      </div>
      <div class="section">
        <div class="section-label">Employer Contributions (Informational)</div>
        <table>
          <tr><td>SSNIT Tier 1 (13.5%)</td><td class="text-right mono">${formatCurrency(r.employer.ssnitTier1)}</td></tr>
          <tr><td>SSNIT Tier 2 (2%)</td><td class="text-right mono">${formatCurrency(r.employer.tier2)}</td></tr>
          <tr><td>GET Tier 2 (2.5%)</td><td class="text-right mono">${formatCurrency(r.employer.getTier2)}</td></tr>
        </table>
        <div class="totals"><table class="totals-table">
          <tr><td>Total Employer Cost</td><td class="text-right mono"><strong>${formatCurrency(r.employer.totalEmployerCost)}</strong></td></tr>
        </table></div>
      </div>
    `
    printDocument({ title: "Payslip", content })
  }

  function formatSalary(val: number) {
    return "$" + Number(val).toLocaleString("en-US", { maximumFractionDigits: 0 })
  }

  const totalEmployees = employees.length
  const activeCount = employees.filter((e) => e.status === "active").length
  const onLeaveCount = leaveRequests.filter((l) => l.status === "pending").length

  const stats = [
    { label: "Total Employees", value: totalEmployees, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Departments", value: departments.length, icon: Building2, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Active", value: activeCount, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Pending Leave", value: onLeaveCount, icon: UserX, color: "text-amber-500", bg: "bg-amber-50" },
  ]

  const attendanceStatsList = [
    { label: "Present Today", value: attendanceStats.presentToday, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Absent Today", value: attendanceStats.absentToday, icon: UserX, color: "text-red-500", bg: "bg-red-50" },
    { label: "Late Today", value: attendanceStats.lateToday, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Avg Hours", value: attendanceStats.avgHours, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
  ]

  const payrollStatsList = [
    { label: "Total Payroll", value: formatSalary(payrollStats.totalPayroll), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Average Salary", value: formatSalary(payrollStats.avgSalary), icon: DollarSign, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Pending Payments", value: payrollStats.pendingPayments, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  ]

  const employeeColumns: Column<Employee>[] = [
    { key: "employeeId", header: "Employee ID", render: (emp) => <span className="text-sm font-medium text-slate-900">{emp.employeeId}</span> },
    { key: "designation", header: "Designation", render: (emp) => <span className="text-sm text-slate-700">{emp.designation}</span> },
    { key: "departmentName", header: "Department", render: (emp) => <span className="text-sm text-slate-700">{emp.departmentName}</span> },
    { key: "employmentType", header: "Type", render: (emp) => <Badge variant={typeBadge(emp.employmentType) as any}>{statusLabel(emp.employmentType)}</Badge> },
    { key: "dateOfJoining", header: "Join Date", render: (emp) => <span className="text-sm text-slate-700">{fmtDate(emp.dateOfJoining)}</span> },
    { key: "salary", header: "Salary", render: (emp) => <span className="text-sm text-slate-700">{formatSalary(emp.salary)}</span> },
    { key: "status", header: "Status", render: (emp) => <Badge variant={statusBadge(emp.status) as any}>{statusLabel(emp.status)}</Badge> },
  ]

  const leaveColumns: Column<LeaveRequest>[] = [
    { key: "employeeName", header: "Employee", render: (lr) => <span className="text-sm font-medium text-slate-900">{lr.employeeName}</span> },
    { key: "leaveType", header: "Type", render: (lr) => <span className="text-sm text-slate-700">{statusLabel(lr.leaveType)}</span> },
    { key: "startDate", header: "Start", render: (lr) => <span className="text-sm text-slate-700">{fmtDate(lr.startDate)}</span> },
    { key: "endDate", header: "End", render: (lr) => <span className="text-sm text-slate-700">{fmtDate(lr.endDate)}</span> },
    { key: "days", header: "Days", render: (lr) => <span className="text-sm text-slate-700">{lr.days}</span> },
    { key: "status", header: "Status", render: (lr) => <Badge variant={statusBadge(lr.status) as any}>{statusLabel(lr.status)}</Badge> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (lr) => (
        <div className="flex items-center justify-end gap-2">
          {lr.status === "pending" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleLeaveAction(lr.id, "approved")} className="text-emerald-600 hover:text-emerald-700">
                <UserCheck className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleLeaveAction(lr.id, "rejected")} className="text-red-600 hover:text-red-700">
                <UserX className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const attendanceColumns: Column<AttendanceRecord>[] = [
    { key: "employeeId", header: "Employee", render: (r) => <span className="text-sm font-medium text-slate-900">{r.employeeName}</span> },
    { key: "clockIn", header: "Clock In", render: (r) => <span className="text-sm text-slate-700">{fmtTime(r.clockIn)}</span> },
    { key: "clockOut", header: "Clock Out", render: (r) => <span className="text-sm text-slate-700">{fmtTime(r.clockOut)}</span> },
    { key: "hours", header: "Hours", render: (r) => <span className="text-sm text-slate-700">{r.hours > 0 ? r.hours.toFixed(1) : "—"}</span> },
    { key: "status", header: "Status", render: (r) => <Badge variant={attendanceBadge(r.status) as any}>{statusLabel(r.status)}</Badge> },
  ]

  const payrollColumns: Column<PayrollRecord>[] = [
    { key: "employeeName", header: "Employee", render: (r) => <span className="text-sm font-medium text-slate-900">{r.employeeName}</span> },
    { key: "baseSalary", header: "Base Salary", render: (r) => <span className="text-sm text-slate-700">{formatSalary(r.baseSalary)}</span> },
    { key: "deductions", header: "Deductions", render: (r) => <span className="text-sm text-red-600">-{formatSalary(r.deductions)}</span> },
    { key: "netPay", header: "Net Pay", render: (r) => <span className="text-sm font-semibold text-slate-900">{formatSalary(r.netPay)}</span> },
    { key: "status", header: "Status", render: (r) => <Badge variant={statusBadge(r.status) as any}>{statusLabel(r.status)}</Badge> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Human Resources"
        description="Manage employees, departments, leave, attendance and payroll"
        action={{ label: "Add Employee", icon: Users, onClick: () => setShowEmpModal(true) }}
        actions={[
          { label: "New Leave", icon: Calendar, onClick: () => setShowLeaveModal(true), variant: "outline" },
          { label: "Mark Attendance", icon: Clock, onClick: () => setShowAttendanceModal(true), variant: "outline" },
        ]}
      />

      {tab === "attendance" ? (
        <StatsGrid stats={attendanceStatsList} />
      ) : tab === "payroll" ? (
        <StatsGrid stats={payrollStatsList} />
      ) : (
        <StatsGrid stats={stats} />
      )}

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {(["employees", "departments", "leaves", "attendance", "payroll"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t ? "bg-white text-slate-900 border border-b-0 border-slate-200" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "employees" ? "Employees" : t === "departments" ? "Departments" : t === "leaves" ? "Leave Requests" : t === "attendance" ? "Attendance" : "Payroll"}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading..." />
      ) : (
        <>
          {tab === "employees" && (
            <Card>
              <CardContent className="p-0">
                <DataTable columns={employeeColumns} data={employees} loading={false} emptyMessage="No employees yet." />
              </CardContent>
            </Card>
          )}

          {tab === "departments" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.length === 0 ? (
                <EmptyState message="No departments found." />
              ) : departments.map((dept) => (
                <Card key={dept.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                        <Building2 className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{dept.name}</p>
                        <p className="text-xs text-slate-500">{dept.code}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-sm text-slate-600"><span className="font-medium">{dept.employeeCount}</span> employee{dept.employeeCount !== 1 ? "s" : ""}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {tab === "leaves" && (
            <Card>
              <CardContent className="p-0">
                <DataTable columns={leaveColumns} data={leaveRequests} loading={false} emptyMessage="No leave requests." />
              </CardContent>
            </Card>
          )}

          {tab === "attendance" && (
            <Card>
              <CardContent className="p-0">
                <DataTable columns={attendanceColumns} data={attendanceRecords} loading={false} emptyMessage="No attendance records for today." />
              </CardContent>
            </Card>
          )}

          {tab === "payroll" && (
            <Card>
              <CardContent className="p-0">
                {payrollRecords.length === 0 && !showPreview ? (
                  <div className="p-6 text-center">
                    <EmptyState message="No payroll records for this month." />
                    <Button onClick={handlePreviewPayroll} disabled={saving} className="mt-4">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {saving ? "Loading..." : "Generate Payroll"}
                    </Button>
                  </div>
                ) : showPreview ? (
                  <div>
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-900">Payroll Preview — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
                      <p className="text-xs text-slate-500 mt-1">Review the Ghana tax breakdown before confirming. Click an employee to view payslip.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="text-left px-4 py-3 font-medium text-slate-600">Employee</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">Basic Salary</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">SSNIT</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">GET</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">NHIL</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">COVID</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">PAYE</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">Net Pay</th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollPreview.map((row) => (
                            <tr key={row.employeeId} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => handleViewPayslip(row)}>
                              <td className="px-4 py-3 font-medium text-slate-900">{row.employeeName}</td>
                              <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.basicSalary)}</td>
                              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.result.employee.ssnitTier1)}</td>
                              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.result.employee.getTier2)}</td>
                              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.result.employee.nhil)}</td>
                              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.result.employee.covidLevy)}</td>
                              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.result.employee.paye)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(row.result.employee.netPay)}</td>
                              <td className="px-4 py-3 text-right">
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handlePrintPayslip(row) }}>
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                            <td className="px-4 py-3 text-slate-900">Totals ({payrollPreview.length} employees)</td>
                            <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(payrollPreview.reduce((s, r) => s + r.basicSalary, 0))}</td>
                            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employee.ssnitTier1, 0))}</td>
                            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employee.getTier2, 0))}</td>
                            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employee.nhil, 0))}</td>
                            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employee.covidLevy, 0))}</td>
                            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employee.paye, 0))}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employee.netPay, 0))}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Employer Contributions</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">SSNIT Tier 1:</span>
                          <span className="ml-2 font-medium">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employer.ssnitTier1, 0))}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">SSNIT Tier 2:</span>
                          <span className="ml-2 font-medium">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employer.tier2, 0))}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">GET Tier 2:</span>
                          <span className="ml-2 font-medium">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employer.getTier2, 0))}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Total Employer Cost:</span>
                          <span className="ml-2 font-bold">{formatCurrency(payrollPreview.reduce((s, r) => s + r.result.employer.totalEmployerCost, 0))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                      <Button variant="outline" onClick={() => { setShowPreview(false); setPayrollPreview([]) }}>Cancel</Button>
                      <Button onClick={handleConfirmPayroll} disabled={saving}>
                        {saving ? "Generating..." : "Confirm & Generate Payroll"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DataTable columns={payrollColumns} data={payrollRecords} loading={false} emptyMessage="No payroll records." />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <CRUDModal open={showEmpModal} onClose={() => setShowEmpModal(false)} onSave={handleCreateEmployee} saving={saving} title="New Employee" disabled={!empForm.designation || !empForm.departmentId}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Designation *</label>
            <input type="text" value={empForm.designation} onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Site Engineer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
            <select value={empForm.departmentId} onChange={(e) => setEmpForm({ ...empForm, departmentId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
            <select value={empForm.employmentType} onChange={(e) => setEmpForm({ ...empForm, employmentType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salary</label>
            <input type="number" value={empForm.salary} onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>

      <CRUDModal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} onSave={handleCreateLeave} saving={saving} title="New Leave Request" disabled={!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
            <select value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.designation} ({emp.employeeId})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
            <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
              <option value="maternity">Maternity</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
              <input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Days</label>
            <input type="number" value={leaveForm.days} onChange={(e) => setLeaveForm({ ...leaveForm, days: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" min={1} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>

      <CRUDModal open={showAttendanceModal} onClose={() => setShowAttendanceModal(false)} onSave={handleMarkAttendance} saving={saving} title="Mark Attendance" disabled={!attendanceForm.employeeId}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
            <select value={attendanceForm.employeeId} onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select employee</option>
              {employees.filter((e) => e.status === "active").map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.designation} ({emp.employeeId})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clock In</label>
              <input type="time" value={attendanceForm.clockIn} onChange={(e) => setAttendanceForm({ ...attendanceForm, clockIn: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clock Out</label>
              <input type="time" value={attendanceForm.clockOut} onChange={(e) => setAttendanceForm({ ...attendanceForm, clockOut: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
        </div>
      </CRUDModal>

      {showPayslip && payslipRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Payslip</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePrintPayslip(payslipRecord)}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                <button onClick={() => setShowPayslip(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center border-b border-slate-200 pb-4">
                <h3 className="text-xl font-bold text-slate-900">BuildProp</h3>
                <p className="text-xs text-slate-500">Construction & Real Estate Management</p>
                <p className="text-xs text-slate-500 mt-1">Payslip — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Employee:</span>
                  <span className="ml-2 font-medium text-slate-900">{payslipRecord.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Employee ID:</span>
                  <span className="ml-2 font-medium text-slate-900">{payslipRecord.employeeId}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Earnings</h4>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Basic Salary</span>
                    <span className="font-medium text-slate-900">{formatCurrency(payslipRecord.basicSalary)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Employee Deductions</h4>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  {[
                    { label: "SSNIT Tier 1 (13.5%)", value: payslipRecord.result.employee.ssnitTier1 },
                    { label: "GET Tier 2 (2.5%)", value: payslipRecord.result.employee.getTier2 },
                    { label: "NHIL (2.5%)", value: payslipRecord.result.employee.nhil },
                    { label: "COVID-19 Health Levy (1%)", value: payslipRecord.result.employee.covidLevy },
                    { label: "PAYE (Income Tax)", value: payslipRecord.result.employee.paye },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-red-600">-{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-semibold">
                    <span className="text-slate-900">Total Deductions</span>
                    <span className="text-red-600">-{formatCurrency(payslipRecord.result.employee.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-slate-900">Net Pay</span>
                  <span className="text-lg font-bold text-emerald-700">{formatCurrency(payslipRecord.result.employee.netPay)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Employer Contributions (Informational)</h4>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  {[
                    { label: "SSNIT Tier 1 (13.5%)", value: payslipRecord.result.employer.ssnitTier1 },
                    { label: "SSNIT Tier 2 (2%)", value: payslipRecord.result.employer.tier2 },
                    { label: "GET Tier 2 (2.5%)", value: payslipRecord.result.employer.getTier2 },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-600">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-semibold">
                    <span className="text-slate-900">Total Employer Cost</span>
                    <span className="text-slate-900">{formatCurrency(payslipRecord.result.employer.totalEmployerCost)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end">
              <Button variant="outline" onClick={() => setShowPayslip(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
