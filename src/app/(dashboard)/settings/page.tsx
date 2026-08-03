"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Save, Settings, Palette, Users, Shield, Download, Upload, RotateCcw, AlertTriangle, Database, Brain, Key, Eye, EyeOff, Zap, Check, X, Loader2, Pencil, Monitor, LogOut, RefreshCw, Mail, Send } from "lucide-react"
import { AI_ENABLED, DEMO_MODE } from "@/lib/features"
import { formatDate } from "@/lib/utils"

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "users", label: "Users", icon: Users },
  { id: "security", label: "Security", icon: Shield },
  { id: "email", label: "Email / SMTP", icon: Mail },
  { id: "backup", label: "Backup & Restore", icon: Database },
  ...(AI_ENABLED ? [{ id: "ai", label: "AI Configuration", icon: Brain }] : []),
]

interface UserRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  role: { id: string; name: string }
}

interface RoleRecord {
  id: string
  name: string
  description: string | null
}

const emptyUserForm = { firstName: "", lastName: "", email: "", phone: "", roleId: "", password: "" }

const errMsg = (data: any, fallback: string) =>
  Array.isArray(data?.details) && data.details.length > 0 ? data.details[0] : data?.error || fallback

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [demoResetting, setDemoResetting] = useState(false)
  const [demoResetMessage, setDemoResetMessage] = useState<string | null>(null)
  const [demoResetError, setDemoResetError] = useState<string | null>(null)

  const [backups, setBackups] = useState<{ filename: string; size: number; sizeFormatted: string; createdAt: string }[]>([])
  const [backingUp, setBackingUp] = useState(false)
  const [lastBackup, setLastBackup] = useState<{ filename: string; sizeFormatted: string } | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [pendingRestoreFilename, setPendingRestoreFilename] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)

  const [aiProviders, setAiProviders] = useState({
    activeProvider: "ollama",
    ollama: { enabled: true, url: "http://127.0.0.1:11435", model: "llama3.2:latest" },
    openai: { enabled: false, apiKey: "", model: "gpt-4o-mini" },
    gemini: { enabled: false, apiKey: "", model: "gemini-flash" },
    anthropic: { enabled: false, apiKey: "", model: "claude-3.5-sonnet" },
  })
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [aiTesting, setAiTesting] = useState<string | null>(null)
  const [aiTestResult, setAiTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const [form, setForm] = useState({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    timezone: "Africa/Accra",
    currency: "GHS",
    dateFormat: "DD/MM/YYYY",
    passwordMinLength: "8",
    requireUppercase: "true",
    requireNumbers: "true",
    twoFactorEnabled: "false",
    sessionTimeout: "30",
  })

  const [emailForm, setEmailForm] = useState({
    host: "",
    port: 465,
    secure: true,
    user: "",
    password: "",
    fromName: "",
    fromEmail: "",
  })
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showTestInput, setShowTestInput] = useState(false)
  const [testEmailTo, setTestEmailTo] = useState("")

  const [dbUsers, setDbUsers] = useState<UserRecord[]>([])
  const [dbRoles, setDbRoles] = useState<RoleRecord[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [savingUser, setSavingUser] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)

  const [sessions, setSessions] = useState<{ id: string; userId: string; loginTime: string; ip: string; userAgent: string; expiresAt: string }[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("buildprop_ai_providers")
    if (stored) {
      try { setAiProviders(JSON.parse(stored)) } catch {}
    }
  }, [])

  async function handleSaveAi() {
    localStorage.setItem("buildprop_ai_providers", JSON.stringify(aiProviders))
    try {
      await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-settings",
          data: {
            activeProvider: aiProviders.activeProvider,
            ollama: {
              enabled: aiProviders.activeProvider === "ollama",
              url: aiProviders.ollama.url,
              model: aiProviders.ollama.model,
            },
            openai: {
              enabled: aiProviders.activeProvider === "openai",
              apiKey: aiProviders.openai.apiKey,
              model: aiProviders.openai.model,
            },
            gemini: {
              enabled: aiProviders.activeProvider === "gemini",
              apiKey: aiProviders.gemini.apiKey,
              model: aiProviders.gemini.model,
            },
            anthropic: {
              enabled: aiProviders.activeProvider === "anthropic",
              apiKey: aiProviders.anthropic.apiKey,
              model: aiProviders.anthropic.model,
            },
          },
        }),
      })
    } catch {}
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch("/api/settings/users")
      const data = await res.json()
      if (data.users) setDbUsers(data.users)
      if (data.roles) setDbRoles(data.roles)
    } catch {}
    setUsersLoading(false)
  }, [])

  useEffect(() => {
    if (activeTab === "users") fetchUsers()
  }, [activeTab, fetchUsers])

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const res = await fetch("/api/auth/sessions")
      const data = await res.json()
      if (Array.isArray(data)) setSessions(data)
    } catch {}
    setSessionsLoading(false)
  }, [])

  useEffect(() => {
    if (activeTab === "security") fetchSessions()
  }, [activeTab, fetchSessions])

  async function handleRevokeSession(id: string) {
    try {
      await fetch(`/api/auth/sessions?id=${id}`, { method: "DELETE" })
      await fetchSessions()
    } catch {}
  }

  function openCreateUser() {
    setEditingUser(null)
    setUserForm(emptyUserForm)
    setUserError(null)
    setShowUserModal(true)
  }

  function openEditUser(user: UserRecord) {
    setEditingUser(user)
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      roleId: user.role.id,
      password: "",
    })
    setUserError(null)
    setShowUserModal(true)
  }

  async function handleSaveUser() {
    if (!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.roleId) {
      setUserError("Please fill in all required fields")
      return
    }
    if (!editingUser && !userForm.password) {
      setUserError("Password is required for new users")
      return
    }
    setSavingUser(true)
    setUserError(null)
    try {
      if (editingUser) {
        const res = await fetch(`/api/settings/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        })
        const data = await res.json()
        if (!res.ok) { setUserError(errMsg(data, "Failed to update user")); setSavingUser(false); return }
      } else {
        const res = await fetch("/api/settings/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        })
        const data = await res.json()
        if (!res.ok) { setUserError(errMsg(data, "Failed to create user")); setSavingUser(false); return }
      }
      setShowUserModal(false)
      await fetchUsers()
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch {
      setUserError("An error occurred")
    }
    setSavingUser(false)
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      await fetch(`/api/settings/users/${id}`, { method: "DELETE" })
      await fetchUsers()
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch {}
  }

  async function testAiProvider(provider: string) {
    setAiTesting(provider)
    setAiTestResult(prev => ({ ...prev, [provider]: { ok: false, msg: "Testing..." } }))
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test-connection",
          data: { provider },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAiTestResult(prev => ({ ...prev, [provider]: { ok: true, msg: data.message || "Connected!" } }))
      } else {
        setAiTestResult(prev => ({ ...prev, [provider]: { ok: false, msg: data.message || errMsg(data, "Failed") } }))
      }
    } catch {
      setAiTestResult(prev => ({ ...prev, [provider]: { ok: false, msg: "Connection failed" } }))
    }
    setAiTesting(null)
  }

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data.configured !== false) {
          setForm(prev => ({
            ...prev,
            companyName: data.companyName || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            timezone: data.timezone || "Africa/Accra",
            currency: data.currency || "GHS",
          }))
          try {
            localStorage.setItem("buildprop_settings", JSON.stringify({ currency: data.currency || "GHS" }))
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          address: form.address,
          phone: form.phone,
          email: form.email,
          website: form.website,
          timezone: form.timezone,
          currency: form.currency,
          dateFormat: form.dateFormat,
          passwordMinLength: form.passwordMinLength,
          requireUppercase: form.requireUppercase,
          requireNumbers: form.requireNumbers,
          twoFactorEnabled: form.twoFactorEnabled,
          sessionTimeout: form.sessionTimeout,
        }),
      })
      if (res.ok) {
        try {
          localStorage.setItem("buildprop_settings", JSON.stringify({ currency: form.currency, dateFormat: form.dateFormat }))
        } catch {}
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } catch {}
    setSaving(false)
  }

  async function handleDemoReset() {
    setDemoResetting(true)
    setDemoResetMessage(null)
    setDemoResetError(null)
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.success) {
        setDemoResetMessage("Demo data reset complete. Please refresh/reload the app to see the restored sample data.")
      } else {
        setDemoResetError(data.error || "Demo reset failed")
      }
    } catch {
      setDemoResetError("Failed to reset demo data")
    } finally {
      setDemoResetting(false)
    }
  }

  const fetchEmailSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/email/settings")
      const data = await res.json()
      if (!data || data.error) return
      setEmailForm({
        host: data.host || "",
        port: data.port || 465,
        secure: data.secure ?? true,
        user: data.user || "",
        password: "",
        fromName: data.fromName || "",
        fromEmail: data.fromEmail || "",
      })
      setEmailConfigured(!!data.configured)
    } catch {}
  }, [])

  useEffect(() => {
    if (activeTab === "email") fetchEmailSettings()
  }, [activeTab, fetchEmailSettings])

  async function handleSaveEmail() {
    if (!emailForm.host || !emailForm.fromEmail) {
      setEmailMsg({ ok: false, text: "SMTP host and From email are required." })
      return
    }
    setEmailSaving(true)
    setEmailMsg(null)
    try {
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: emailForm.host,
          port: Number(emailForm.port) || (emailForm.secure ? 465 : 587),
          secure: emailForm.secure,
          user: emailForm.user,
          password: emailForm.password,
          fromName: emailForm.fromName,
          fromEmail: emailForm.fromEmail,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailMsg({ ok: true, text: "Email settings saved successfully." })
        setEmailConfigured(true)
        setEmailForm(prev => ({ ...prev, password: "" }))
      } else {
        setEmailMsg({ ok: false, text: errMsg(data, "Failed to save email settings") })
      }
    } catch {
      setEmailMsg({ ok: false, text: "Failed to save email settings" })
    }
    setEmailSaving(false)
  }

  async function handleSendTestEmail() {
    if (!testEmailTo) {
      setEmailMsg({ ok: false, text: "Please enter a destination email address." })
      return
    }
    setEmailTesting(true)
    setEmailMsg(null)
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailTo }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailMsg({ ok: true, text: `Test email sent to ${testEmailTo}.` })
      } else {
        setEmailMsg({ ok: false, text: errMsg(data, "Test email failed") })
      }
    } catch {
      setEmailMsg({ ok: false, text: "Test email failed" })
    }
    setEmailTesting(false)
  }

  function toggleEmailSecure() {
    setEmailForm(prev => {
      const secure = !prev.secure
      return { ...prev, secure, port: secure ? 465 : 587 }
    })
  }

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/backup")
      const data = await res.json()
      if (data.backups) setBackups(data.backups)
    } catch {}
  }, [])

  useEffect(() => {
    if (activeTab === "backup") fetchBackups()
  }, [activeTab, fetchBackups])

  async function handleCreateBackup() {
    setBackingUp(true)
    setBackupError(null)
    setLastBackup(null)
    try {
      const res = await fetch("/api/backup", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setLastBackup({ filename: data.backup.filename, sizeFormatted: data.backup.sizeFormatted })
        await fetchBackups()
      } else {
        setBackupError(errMsg(data, "Backup failed"))
      }
    } catch {
      setBackupError("Failed to create backup")
    } finally {
      setBackingUp(false)
    }
  }

  async function handleRestoreFromBackup(filename: string) {
    setPendingRestoreFilename(filename)
    setShowRestoreConfirm(true)
  }

  async function confirmRestore() {
    if (!pendingRestoreFilename) return
    setRestoring(true)
    setShowRestoreConfirm(false)
    setBackupError(null)
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: pendingRestoreFilename }),
      })
      const data = await res.json()
      if (data.success) {
        setShowToast(true)
        setTimeout(() => setShowToast(false), 4000)
      } else {
        setBackupError(errMsg(data, "Restore failed"))
      }
    } catch {
      setBackupError("Failed to restore backup")
    } finally {
      setRestoring(false)
      setPendingRestoreFilename(null)
    }
  }

  async function handleUploadRestore() {
    if (!restoreFile) return
    setRestoring(true)
    setBackupError(null)
    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '.').slice(0, 19)
      const filename = `buildprop-backup-${timestamp}.db`
      const formData = new FormData()
      formData.append("file", restoreFile)
      formData.append("filename", filename)

      // First upload the file to backups dir, then restore
      const uploadRes = await fetch("/api/backup/upload", {
        method: "POST",
        body: formData,
      })

      if (uploadRes.ok) {
        const restoreRes = await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename }),
        })
        const data = await restoreRes.json()
        if (data.success) {
          setShowToast(true)
          setRestoreFile(null)
          setTimeout(() => setShowToast(false), 4000)
        } else {
          setBackupError(errMsg(data, "Restore failed"))
        }
      } else {
        setBackupError("Failed to upload backup file")
      }
    } catch {
      setBackupError("Failed to upload and restore")
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500">Configure your system preferences and account</p>
        </div>
        <div className="py-12 text-center text-slate-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {DEMO_MODE && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-orange-900">Demo Edition</h2>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            This is the separate BuildProp Demo build with sample data. Resetting restores the original sample dataset.
          </p>
          <Button
            onClick={handleDemoReset}
            disabled={demoResetting}
            className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {demoResetting ? "Resetting..." : "Reset Demo Data"}
          </Button>
          {demoResetMessage && (
            <p className="text-sm font-medium text-emerald-700 mt-3">{demoResetMessage}</p>
          )}
          {demoResetError && (
            <p className="text-sm font-medium text-red-700 mt-3">{demoResetError}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500">Configure your system preferences and account</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input type="text" value={form.companyName} onChange={e => update("companyName", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input type="text" value={form.address} onChange={e => update("address", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={e => update("phone", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => update("email", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input type="url" value={form.website} onChange={e => update("website", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="https://" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "preferences" && (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select value={form.currency} onChange={e => update("currency", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="GHS">GHS - Ghanaian Cedi</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                <select value={form.timezone} onChange={e => update("timezone", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                  <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                  <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                  <option value="America/New_York">America/New_York (GMT-5/-4)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Format</label>
                <select value={form.dateFormat} onChange={e => update("dateFormat", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "users" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <Button onClick={openCreateUser} size="sm">
              <Users className="h-4 w-4 mr-1" />
              Add User
            </Button>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <p className="text-sm text-slate-500 py-4">Loading users...</p>
            ) : dbUsers.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Last Login</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <span className="font-medium text-slate-900">{user.firstName} {user.lastName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{user.email}</td>
                        <td className="py-3 px-4 text-sm text-slate-700">{user.role.name}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditUser(user)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit">
                              <Pencil className="h-4 w-4 text-slate-500" />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 hover:bg-slate-100 rounded" title="Delete">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Password Length</label>
                  <input type="number" value={form.passwordMinLength} onChange={e => update("passwordMinLength", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Require Uppercase Letters</span>
                  <button onClick={() => update("requireUppercase", form.requireUppercase === "true" ? "false" : "true")} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.requireUppercase === "true" ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.requireUppercase === "true" ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Require Numbers</span>
                  <button onClick={() => update("requireNumbers", form.requireNumbers === "true" ? "false" : "true")} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.requireNumbers === "true" ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.requireNumbers === "true" ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session & 2FA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Session Timeout (minutes)</label>
                  <input type="number" value={form.sessionTimeout} onChange={e => update("sessionTimeout", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-700">Two-Factor Authentication</span>
                    <p className="text-xs text-slate-400">Require 2FA for all admin accounts</p>
                  </div>
                  <button onClick={() => update("twoFactorEnabled", form.twoFactorEnabled === "true" ? "false" : "true")} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.twoFactorEnabled === "true" ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.twoFactorEnabled === "true" ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-slate-500" />
                Active Sessions
              </CardTitle>
              <Button onClick={fetchSessions} variant="outline" size="sm">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <p className="text-sm text-slate-500 py-4">Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No active sessions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">User</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">IP Address</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Login Time</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Expires</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{session.userId}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{session.ip}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{new Date(session.loginTime).toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{new Date(session.expiresAt).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeSession(session.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "email" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Email / SMTP Settings
            </CardTitle>
            <p className="text-sm text-slate-500">
              Configure an SMTP account to send invoices, payment reminders, and quick messages to your contacts.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-3xl">
              {emailConfigured && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  SMTP account configured. Emails can be sent from the app.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host *</label>
                  <input type="text" value={emailForm.host} onChange={e => setEmailForm({ ...emailForm, host: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                  <input type="number" value={emailForm.port} onChange={e => setEmailForm({ ...emailForm, port: Number(e.target.value) || 0 })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex items-end pb-2">
                  <button type="button" onClick={toggleEmailSecure} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailForm.secure ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailForm.secure ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="ml-3 text-sm text-slate-700">Use SSL/TLS (secure connection)</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input type="text" value={emailForm.user} onChange={e => setEmailForm({ ...emailForm, user: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" value={emailForm.password} onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Leave blank to keep existing" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
                  <input type="text" value={emailForm.fromName} onChange={e => setEmailForm({ ...emailForm, fromName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="BuildProp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Email *</label>
                  <input type="email" value={emailForm.fromEmail} onChange={e => setEmailForm({ ...emailForm, fromEmail: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="noreply@example.com" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSaveEmail} disabled={emailSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {emailSaving ? "Saving..." : "Save Email Settings"}
                </Button>
                <Button variant="outline" onClick={() => setShowTestInput(v => !v)} disabled={!emailConfigured}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </Button>
              </div>
              {showTestInput && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl max-w-lg">
                  <input
                    type="email"
                    value={testEmailTo}
                    onChange={e => setTestEmailTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <Button onClick={handleSendTestEmail} disabled={emailTesting} size="sm">
                    {emailTesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    Send
                  </Button>
                </div>
              )}
              {emailMsg && (
                <div className={`rounded-lg border p-3 text-sm ${emailMsg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  {emailMsg.ok ? <Check className="h-4 w-4 inline mr-1" /> : <X className="h-4 w-4 inline mr-1" />}
                  {emailMsg.text}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "backup" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Create Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Create a snapshot of your current database. This copies the SQLite database file and exports table data as JSON.
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={handleCreateBackup} disabled={backingUp} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    {backingUp ? "Creating Backup..." : "Create Backup"}
                  </Button>
                  {backingUp && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Backing up database...
                    </div>
                  )}
                </div>
                {lastBackup && (
                  <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm">
                    <p className="font-medium text-blue-800">Backup created successfully</p>
                    <p className="text-blue-600 mt-1">File: {lastBackup.filename} ({lastBackup.sizeFormatted})</p>
                  </div>
                )}
                {backupError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
                    <p className="font-medium text-red-800">{backupError}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-slate-500" />
                Backup History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No backups found. Create your first backup above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Filename</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Size</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((backup) => (
                        <tr key={backup.filename} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{backup.filename}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{new Date(backup.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{backup.sizeFormatted}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreFromBackup(backup.filename)}
                              disabled={restoring}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-slate-500" />
                Upload & Restore
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Restoring will overwrite current data. Please create a backup first.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".db"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <Button
                    onClick={handleUploadRestore}
                    disabled={!restoreFile || restoring}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {restoring ? "Restoring..." : "Upload & Restore"}
                  </Button>
                </div>
                {restoreFile && (
                  <p className="text-sm text-slate-600">Selected: {restoreFile.name}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "ai" && AI_ENABLED && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Provider Configuration
              </CardTitle>
              <p className="text-sm text-slate-500">Configure AI providers for chat, insights, and predictions</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-700">Active Provider:</span>
                <select value={aiProviders.activeProvider} onChange={(e) => setAiProviders(prev => ({ ...prev, activeProvider: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
                <div className="ml-auto"><Button onClick={handleSaveAi} size="sm"><Save className="h-4 w-4 mr-1" /> Save</Button></div>
              </div>

              {/* Ollama */}
              <div className={`border rounded-xl p-4 ${aiProviders.ollama.enabled ? 'border-green-300 bg-green-50/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center"><Zap className="h-4 w-4 text-green-600" /></div>
                    <div><h4 className="font-medium text-slate-900">Ollama (Local)</h4><p className="text-xs text-slate-500">Free, runs on your machine</p></div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={aiProviders.ollama.enabled} onChange={(e) => setAiProviders(prev => ({ ...prev, ollama: { ...prev.ollama, enabled: e.target.checked } }))} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Server URL</label>
                    <input value={aiProviders.ollama.url} onChange={(e) => setAiProviders(prev => ({ ...prev, ollama: { ...prev.ollama, url: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="http://127.0.0.1:11435" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                    <select value={aiProviders.ollama.model} onChange={(e) => setAiProviders(prev => ({ ...prev, ollama: { ...prev.ollama, model: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="llama3.2:3b">llama3.2:3b (Fast)</option>
                      <option value="llama3.2:latest">llama3.2:latest (Detailed)</option>
                      <option value="llama3.1:8b">llama3.1:8b (Balanced)</option>
                      <option value="mistral">mistral (Alternative)</option>
                    </select></div>
                </div>
                <button onClick={() => testAiProvider("ollama")} disabled={aiTesting === "ollama"} className="mt-3 text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1">
                  {aiTesting === "ollama" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Test Connection</button>
                {aiTestResult.ollama && <p className={`text-xs mt-1 ${aiTestResult.ollama?.ok ? 'text-green-600' : 'text-red-500'}`}>{aiTestResult.ollama.msg}</p>}
              </div>

              {/* OpenAI */}
              <div className={`border rounded-xl p-4 ${aiProviders.openai.enabled ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center"><Key className="h-4 w-4 text-blue-600" /></div>
                    <div><h4 className="font-medium text-slate-900">OpenAI</h4><p className="text-xs text-slate-500">GPT-4o, GPT-4o-mini</p></div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={aiProviders.openai.enabled} onChange={(e) => setAiProviders(prev => ({ ...prev, openai: { ...prev.openai, enabled: e.target.checked } }))} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
                    <div className="relative"><input type={showApiKey.openai ? "text" : "password"} value={aiProviders.openai.apiKey} onChange={(e) => setAiProviders(prev => ({ ...prev, openai: { ...prev.openai, apiKey: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm pr-8" placeholder="sk-..." />
                    <button type="button" onClick={() => setShowApiKey(prev => ({ ...prev, openai: !prev.openai }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showApiKey.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                    <select value={aiProviders.openai.model} onChange={(e) => setAiProviders(prev => ({ ...prev, openai: { ...prev.openai, model: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="gpt-4o">GPT-4o (Best)</option>
                      <option value="gpt-4o-mini">GPT-4o-mini (Fast)</option>
                      <option value="gpt-3.5-turbo">GPT-3.5-turbo (Cheapest)</option>
                    </select></div>
                </div>
                <button onClick={() => testAiProvider("openai")} disabled={aiTesting === "openai"} className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  {aiTesting === "openai" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Test Connection</button>
                {aiTestResult.openai && <p className={`text-xs mt-1 ${aiTestResult.openai?.ok ? 'text-green-600' : 'text-red-500'}`}>{aiTestResult.openai.msg}</p>}
              </div>

              {/* Gemini */}
              <div className={`border rounded-xl p-4 ${aiProviders.gemini.enabled ? 'border-purple-300 bg-purple-50/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center"><Zap className="h-4 w-4 text-purple-600" /></div>
                    <div><h4 className="font-medium text-slate-900">Google Gemini</h4><p className="text-xs text-slate-500">Gemini Pro, Gemini Flash</p></div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={aiProviders.gemini.enabled} onChange={(e) => setAiProviders(prev => ({ ...prev, gemini: { ...prev.gemini, enabled: e.target.checked } }))} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
                    <div className="relative"><input type={showApiKey.gemini ? "text" : "password"} value={aiProviders.gemini.apiKey} onChange={(e) => setAiProviders(prev => ({ ...prev, gemini: { ...prev.gemini, apiKey: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm pr-8" placeholder="AIza..." />
                    <button type="button" onClick={() => setShowApiKey(prev => ({ ...prev, gemini: !prev.gemini }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showApiKey.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                    <select value={aiProviders.gemini.model} onChange={(e) => setAiProviders(prev => ({ ...prev, gemini: { ...prev.gemini, model: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="gemini-flash">Gemini Flash (Fast)</option>
                      <option value="gemini-pro">Gemini Pro (Detailed)</option>
                    </select></div>
                </div>
                <button onClick={() => testAiProvider("gemini")} disabled={aiTesting === "gemini"} className="mt-3 text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1">
                  {aiTesting === "gemini" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Test Connection</button>
                {aiTestResult.gemini && <p className={`text-xs mt-1 ${aiTestResult.gemini?.ok ? 'text-green-600' : 'text-red-500'}`}>{aiTestResult.gemini.msg}</p>}
              </div>

              {/* Anthropic */}
              <div className={`border rounded-xl p-4 ${aiProviders.anthropic.enabled ? 'border-orange-300 bg-orange-50/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center"><Brain className="h-4 w-4 text-orange-600" /></div>
                    <div><h4 className="font-medium text-slate-900">Anthropic Claude</h4><p className="text-xs text-slate-500">Claude 3.5 Sonnet, Claude 3 Haiku</p></div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={aiProviders.anthropic.enabled} onChange={(e) => setAiProviders(prev => ({ ...prev, anthropic: { ...prev.anthropic, enabled: e.target.checked } }))} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
                    <div className="relative"><input type={showApiKey.anthropic ? "text" : "password"} value={aiProviders.anthropic.apiKey} onChange={(e) => setAiProviders(prev => ({ ...prev, anthropic: { ...prev.anthropic, apiKey: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm pr-8" placeholder="sk-ant-..." />
                    <button type="button" onClick={() => setShowApiKey(prev => ({ ...prev, anthropic: !prev.anthropic }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showApiKey.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                    <select value={aiProviders.anthropic.model} onChange={(e) => setAiProviders(prev => ({ ...prev, anthropic: { ...prev.anthropic, model: e.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Best)</option>
                      <option value="claude-3-haiku">Claude 3 Haiku (Fast)</option>
                    </select></div>
                </div>
                <button onClick={() => testAiProvider("anthropic")} disabled={aiTesting === "anthropic"} className="mt-3 text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1">
                  {aiTesting === "anthropic" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Test Connection</button>
                {aiTestResult.anthropic && <p className={`text-xs mt-1 ${aiTestResult.anthropic?.ok ? 'text-green-600' : 'text-red-500'}`}>{aiTestResult.anthropic.msg}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 space-y-4">
            <h3 className="font-semibold text-slate-900">{editingUser ? "Edit User" : "Add User"}</h3>
            {userError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{userError}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                <input type="text" value={userForm.firstName} onChange={e => setUserForm({...userForm, firstName: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                <input type="text" value={userForm.lastName} onChange={e => setUserForm({...userForm, lastName: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="text" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <select value={userForm.roleId} onChange={e => setUserForm({...userForm, roleId: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="">Select role...</option>
                  {dbRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder={editingUser ? "Leave blank to keep current" : ""} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
              <Button onClick={handleSaveUser} disabled={savingUser}>
                {savingUser ? "Saving..." : editingUser ? "Update User" : "Create User"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Confirm Restore</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to restore from <strong>{pendingRestoreFilename}</strong>? This will overwrite all current data.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowRestoreConfirm(false); setPendingRestoreFilename(null) }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmRestore} disabled={restoring}>
                {restoring ? "Restoring..." : "Restore Now"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-sm font-medium">Settings saved successfully.</span>
          </div>
        </div>
      )}
    </div>
  )
}

