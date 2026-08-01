"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HardHat, Eye, EyeOff, Lock, Mail, X, ShieldCheck, Users } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)

  // On a fresh install (empty DB / no settings) bounce straight to the setup
  // wizard. /setup is a public path and only redirects back when configured,
  // so this cannot loop.
  useEffect(() => {
    let cancelled = false
    fetch("/api/setup")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json && json.configured === false) {
          router.replace("/setup")
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || `Login failed (${res.status})`)
        return
      }

      localStorage.setItem("buildprop_user", JSON.stringify(data.user))
      localStorage.setItem("buildprop_user_ui", "true")
      window.location.href = "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ea580c]/20 via-[#c2410c]/10 to-[#431407]/60" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-300/10 rounded-full translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500">
              <HardHat className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">BuildProp</h1>
              <p className="text-sm text-orange-100/80">Management System</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Construction & Real Estate<br />
            <span className="text-amber-300">Management Platform</span>
          </h2>

          <p className="text-orange-50/90 text-lg max-w-md leading-relaxed">
            End-to-end solution for managing administrative operations, construction projects,
            real estate sales, land records, finances, and human resources.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6">
            {[
              { value: "30+", label: "Modules" },
              { value: "24/7", label: "Access" },
              { value: "100%", label: "Secure" },
              { value: "8", label: "Scalable" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-black/10 border border-white/20">
                <p className="text-2xl font-bold text-amber-300">{stat.value}</p>
                <p className="text-sm text-orange-50/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500">
              <HardHat className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">BuildProp</h1>
              <p className="text-xs text-slate-500">Management System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@buildprop.com"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-11 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-orange-500 hover:text-orange-600 font-medium">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 py-3 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowForgot(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12] px-6 py-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-300" />
                  Forgot your password?
                </h3>
                <p className="text-sm text-orange-100/90 mt-1">Here&apos;s how to get back into your account.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="text-orange-100 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  For staff
                </h4>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Your company&apos;s <span className="font-medium text-slate-900">Super Admin</span> can reset your
                  password from the <span className="font-medium text-slate-900">Users &amp; Roles</span> page
                  (sidebar → Settings area).
                </p>
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-orange-500" />
                  For the Super Admin / owner
                </h4>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Recovery options include restoring from the automatic backups the app creates on startup
                  (<span className="font-medium text-slate-900">backups/auto</span> folder), or contact{" "}
                  <span className="font-medium text-slate-900">BuildProp support</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full rounded-xl bg-orange-500 py-3 text-white font-medium hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

