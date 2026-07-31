"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/dashboard/toast"
import { formatDate } from "@/lib/utils"
import { UserPlus, Users, Pencil, Power, RotateCcw, X, Loader2, ShieldAlert } from "lucide-react"

interface UserRecord {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  role: { id: string; name: string }
}

interface RoleRecord {
  id: string
  name: string
  description: string | null
  level: number
}

interface MeResponse {
  user: { id: string; firstName: string; lastName: string; email: string; role: { id: string; name: string }; active: boolean }
  permissions: string[]
}

const emptyForm = { firstName: "", lastName: "", email: "", roleId: "", password: "" }

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [denied, setDenied] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  // Gate: only Super Admin / Admin may manage users.
  useEffect(() => {
    let cancelled = false
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: MeResponse) => {
        if (cancelled) return
        const roleName = data.user?.role?.name || ""
        setCurrentUserId(data.user?.id || null)
        if (roleName !== "Super Admin" && roleName !== "Admin") {
          setDenied(true)
          toast({ title: "Access denied", description: "Only administrators can manage users", variant: "error" })
          setTimeout(() => {
            if (!cancelled) router.replace("/")
          }, 1200)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAccessChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [router, toast])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      if (res.ok && Array.isArray(data.users)) setUsers(data.users)
      else if (data.error) toast({ title: "Failed to load users", description: data.error, variant: "error" })
    } catch {
      toast({ title: "Failed to load users", description: "Network error", variant: "error" })
    }
  }, [toast])

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles")
      const data = await res.json()
      if (res.ok && Array.isArray(data.roles)) setRoles(data.roles)
    } catch {}
  }, [])

  useEffect(() => {
    if (!denied) {
      fetchUsers()
      fetchRoles()
    }
  }, [denied, fetchUsers, fetchRoles])

  function openCreate() {
    setEditingUser(null)
    setForm(emptyForm)
    setActive(true)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(user: UserRecord) {
    setEditingUser(user)
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.role.id,
      password: "",
    })
    setActive(user.isActive)
    setFormError(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.roleId) {
      setFormError("Please fill in all required fields")
      return
    }
    if (!editingUser && form.password.length < 8) {
      setFormError("Password is required (minimum 8 characters)")
      return
    }
    if (editingUser && form.password && form.password.length < 8) {
      setFormError("New password must be at least 8 characters")
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            roleId: form.roleId,
            active,
            ...(form.password ? { password: form.password } : {}),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setFormError(data.error || "Failed to update user")
          setSaving(false)
          return
        }
        toast({ title: "User updated", description: `${data.user?.firstName} ${data.user?.lastName}`, variant: "success" })
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            roleId: form.roleId,
            password: form.password,
            active,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setFormError(data.error || "Failed to create user")
          setSaving(false)
          return
        }
        toast({ title: "User created", description: `${data.user?.firstName} ${data.user?.lastName}`, variant: "success" })
      }
      setShowModal(false)
      await fetchUsers()
    } catch {
      setFormError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: UserRecord) {
    if (user.isActive && !window.confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName}? They will no longer be able to sign in.`)) {
      return
    }
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.isActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Action failed", description: data.error || "Something went wrong", variant: "error" })
        return
      }
      toast({ title: user.isActive ? "User deactivated" : "User reactivated", description: user.email, variant: "success" })
      await fetchUsers()
    } catch {
      toast({ title: "Action failed", description: "Network error", variant: "error" })
    }
  }

  if (!accessChecked) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-orange-500" />
        Loading users...
      </div>
    )
  }

  if (denied) {
    return (
      <div className="py-24 text-center">
        <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-sm text-slate-500 mt-2">Only Super Admin and Admin roles can manage users.</p>
        <p className="text-xs text-slate-400 mt-1">Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage user accounts and their access roles</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Last Login</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No users found. Add your first user.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === currentUserId
                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                            {(user.firstName[0] || "?").toUpperCase()}{(user.lastName[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900">
                              {user.firstName} {user.lastName}
                            </span>
                            {isSelf && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            user.role.name === "Super Admin" || user.role.name === "Admin"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {user.role.name}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.isActive ? "success" : "destructive"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isSelf ? "You cannot deactivate your own account" : user.isActive ? "Deactivate" : "Reactivate"}
                          >
                            {user.isActive ? (
                              <Power className="h-4 w-4 text-red-500" />
                            ) : (
                              <RotateCcw className="h-4 w-4 text-emerald-500" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setShowModal(false)}>
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser ? "Edit User" : "Add User"}
              </h2>
              <button onClick={() => setShowModal(false)} disabled={saving} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 bg-white"
                >
                  <option value="">Select a role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}{role.description ? ` — ${role.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {editingUser ? "New Password (optional)" : "Password *"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingUser ? "Leave blank to keep current password" : "Minimum 8 characters"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>

              {editingUser && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Account Active</span>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? "bg-emerald-500" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              )}

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
