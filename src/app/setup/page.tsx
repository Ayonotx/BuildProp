"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HardHat, Building2, Globe, Settings, UserPlus, CheckCircle2, ArrowLeft, ArrowRight, Lock, Mail, Phone, MapPin, Calendar, DollarSign } from "lucide-react"

const steps = [
  { id: 1, label: "Welcome", icon: HardHat },
  { id: 2, label: "Company", icon: Building2 },
  { id: 3, label: "Preferences", icon: Settings },
  { id: 4, label: "Admin", icon: UserPlus },
  { id: 5, label: "Complete", icon: CheckCircle2 },
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/setup")
      .then(r => r.json())
      .then(json => {
        if (json.configured) {
          router.replace("/")
        }
      })
  }, [router])

  const [companyName, setCompanyName] = useState("")
  const [logo, setLogo] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [timezone, setTimezone] = useState("UTC")
  const [fiscalYearStart, setFiscalYearStart] = useState("January")
  const [adminFirstName, setAdminFirstName] = useState("")
  const [adminLastName, setAdminLastName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const canNext = () => {
    if (step === 1) return true
    if (step === 2) return companyName.trim().length > 0
    if (step === 3) return true
    if (step === 4) {
      return (
        adminFirstName.trim().length > 0 &&
        adminLastName.trim().length > 0 &&
        adminEmail.trim().length > 0 &&
        adminPassword.length >= 6 &&
        adminPassword === confirmPassword
      )
    }
    return true
  }

  const handleFinish = async () => {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName, logo, address, phone, email, website,
          currency, timezone, fiscalYearStart,
          adminEmail, adminPassword, adminFirstName, adminLastName,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || "Setup failed")
        setLoading(false)
        return
      }

      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 py-3 px-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
  const selectClass = "w-full rounded-xl border border-slate-200 py-3 px-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all bg-white"

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500">
              <HardHat className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">BuildProp</h1>
              <p className="text-sm text-slate-400">Management System</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Construction & Real Estate<br />
            <span className="text-orange-400">Management Platform</span>
          </h2>

          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Let&apos;s get your company set up with a customized management system tailored to your needs.
          </p>

          <div className="mt-12 space-y-4">
            {[
              "Project management & tracking",
              "Real estate & property listings",
              "Financial accounting & invoicing",
              "Human resources & payroll",
              "Land records management",
              "Inventory & procurement",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-orange-400 shrink-0" />
                <p className="text-slate-300">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 px-6 pt-6 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
            <HardHat className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">BuildProp</span>
        </div>

        {/* Step indicator */}
        <div className="px-8 pt-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      step > s.id
                        ? "bg-green-500 text-white"
                        : step === s.id
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${step >= s.id ? "text-slate-700" : "text-slate-400"}`}>
                    {s.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-2 mt-[-20px]">
                    <div className={`h-0.5 ${step > s.id ? "bg-green-500" : "bg-slate-100"} transition-all`} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="w-full max-w-lg">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500 mx-auto mb-6">
                  <HardHat className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to BuildProp</h2>
                <p className="text-slate-500 text-lg max-w-sm mx-auto">
                  Let&apos;s set up your Construction & Real Estate Management System
                </p>
                <p className="text-slate-400 mt-4 text-sm max-w-sm mx-auto">
                  This quick setup will configure your company details, preferences, and create your administrator account.
                </p>
              </div>
            )}

            {/* Step 2: Company Information */}
            {step === 2 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-bold text-slate-900">Company Information</h2>
                </div>
                <p className="text-slate-500 text-sm mb-6">Tell us about your company</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo URL</label>
                    <input
                      type="text"
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St, City, Country"
                      rows={2}
                      className={inputClass + " resize-none"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 234 567 890"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="info@company.com"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://www.company.com"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {step === 3 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-bold text-slate-900">Preferences</h2>
                </div>
                <p className="text-slate-500 text-sm mb-6">Configure your system preferences</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
                      <option value="USD">USD - US Dollar ($)</option>
                      <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                      <option value="NGN">NGN - Nigerian Naira (₦)</option>
                      <option value="KES">KES - Kenyan Shilling (KSh)</option>
                      <option value="GBP">GBP - British Pound (£)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Africa/Lagos">Lagos (WAT)</option>
                      <option value="Africa/Accra">Accra (GMT)</option>
                      <option value="Africa/Nairobi">Nairobi (EAT)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Australia/Sydney">Sydney (AEST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Fiscal Year Start</label>
                    <select value={fiscalYearStart} onChange={(e) => setFiscalYearStart(e.target.value)} className={selectClass}>
                      <option value="January">January</option>
                      <option value="April">April</option>
                      <option value="July">July</option>
                      <option value="October">October</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Admin Account */}
            {step === 4 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-bold text-slate-900">Admin Account</h2>
                </div>
                <p className="text-slate-500 text-sm mb-6">Create the administrator account</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
                      <input
                        type="text"
                        value={adminFirstName}
                        onChange={(e) => setAdminFirstName(e.target.value)}
                        placeholder="John"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
                      <input
                        type="text"
                        value={adminLastName}
                        onChange={(e) => setAdminLastName(e.target.value)}
                        placeholder="Doe"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className={inputClass + " pl-11"}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password * (min 6 characters)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter a strong password"
                        className={inputClass + " pl-11"}
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className={inputClass + " pl-11"}
                        required
                      />
                    </div>
                    {confirmPassword && adminPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Completion */}
            {step === 5 && (
              <div className="text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
                <p className="text-slate-500 text-lg mb-8">Your system is ready to use</p>

                <div className="bg-slate-50 rounded-xl p-6 text-left max-w-sm mx-auto space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Company</span>
                    <span className="text-sm font-medium text-slate-900">{companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Currency</span>
                    <span className="text-sm font-medium text-slate-900">{currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Timezone</span>
                    <span className="text-sm font-medium text-slate-900">{timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Fiscal Year</span>
                    <span className="text-sm font-medium text-slate-900">Starts {fiscalYearStart}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Admin</span>
                    <span className="text-sm font-medium text-slate-900">{adminFirstName} {adminLastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Admin Email</span>
                    <span className="text-sm font-medium text-slate-900">{adminEmail}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="px-8 pb-8 flex justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 rounded-xl bg-[#0f172a] px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Setting up...
                </>
              ) : (
                <>
                  Launch BuildProp
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
