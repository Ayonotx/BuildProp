"use client"

import React, { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Save } from "lucide-react"

const STORAGE_KEY = "buildprop-website-settings"

const defaults = {
  siteName: "BuildProp Real Estate",
  description: "Premier real estate development company in Ghana. We build quality homes and commercial properties.",
  contactPhone: "+233 30 123 4567",
  contactEmail: "info@buildprop.com",
  contactAddress: "123 Independence Ave, Accra, Ghana",
  facebook: "https://facebook.com/buildprop",
  twitter: "https://twitter.com/buildprop",
  instagram: "https://instagram.com/buildprop",
  linkedin: "https://linkedin.com/company/buildprop",
  metaTitle: "BuildProp \u2014 Quality Real Estate Development in Ghana",
  metaDescription: "BuildProp develops premium residential and commercial properties across Ghana. Browse our latest projects and find your dream home.",
  metaKeywords: "real estate ghana, property development, homes accra, apartments tema, buildprop",
  listingPageSize: "12",
  showPrices: "true",
  enableInquiries: "true",
}

function loadForm() {
  if (typeof window === "undefined") return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return defaults
  }
}

export default function WebsitePage() {
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const [form, setForm] = useState(defaults)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setForm(loadForm())
    setLoaded(true)
  }, [])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    toast("Website settings saved successfully.")
  }

  if (!loaded) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Integration"
        description="Configure your public website settings and SEO"
        action={{ label: "Save Settings", icon: Save, onClick: handleSave }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Name</label>
                  <input type="text" value={form.siteName} onChange={e => update("siteName", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => update("description", e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                    <input type="text" value={form.contactPhone} onChange={e => update("contactPhone", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                    <input type="email" value={form.contactEmail} onChange={e => update("contactEmail", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Address</label>
                  <input type="text" value={form.contactAddress} onChange={e => update("contactAddress", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { field: "facebook", label: "Facebook" },
                  { field: "twitter", label: "Twitter / X" },
                  { field: "instagram", label: "Instagram" },
                  { field: "linkedin", label: "LinkedIn" },
                ].map(s => (
                  <div key={s.field}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{s.label}</label>
                    <input type="url" value={form[s.field as keyof typeof form]} onChange={e => update(s.field, e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="https://" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meta Title</label>
                  <input type="text" value={form.metaTitle} onChange={e => update("metaTitle", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  <p className="text-xs text-slate-400 mt-1">{form.metaTitle.length}/60 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meta Description</label>
                  <textarea value={form.metaDescription} onChange={e => update("metaDescription", e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  <p className="text-xs text-slate-400 mt-1">{form.metaDescription.length}/160 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Keywords</label>
                  <input type="text" value={form.metaKeywords} onChange={e => update("metaKeywords", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Comma-separated keywords" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Listing Page Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Items per Page</label>
                  <select value={form.listingPageSize} onChange={e => update("listingPageSize", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                    <option value="8">8</option>
                    <option value="12">12</option>
                    <option value="24">24</option>
                    <option value="48">48</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Show Prices</span>
                  <button onClick={() => update("showPrices", form.showPrices === "true" ? "false" : "true")} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.showPrices === "true" ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.showPrices === "true" ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Enable Inquiries</span>
                  <button onClick={() => update("enableInquiries", form.enableInquiries === "true" ? "false" : "true")} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enableInquiries === "true" ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enableInquiries === "true" ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-4">
                  <p className="text-white font-semibold">{form.siteName}</p>
                </div>
                <div className="p-4 space-y-2">
                  <div className="h-24 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                    <Globe className="h-8 w-8 text-orange-300" />
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{form.description}</p>
                  <p className="text-xs text-slate-400">{form.contactEmail}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">Live preview updates as you edit settings above</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}
