"use client"

import React from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent } from "@/components/ui/card"
import {
  CreditCard,
  MessageSquare,
  MapPin,
  Calculator,
  Clock,
  Cloud,
  Calendar,
  Send,
  Smartphone,
  Globe,
  Link2,
  Settings,
  Zap,
} from "lucide-react"

interface Integration {
  id: number
  name: string
  description: string
  icon: typeof Calculator
  color: string
  bg: string
}

const categories: { name: string; integrations: Integration[] }[] = [
  {
    name: "Payment Gateways",
    integrations: [
      { id: 1, name: "Stripe", description: "Accept credit/debit card payments online via Stripe's secure checkout. Supports one-time and recurring payments.", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-50" },
      { id: 2, name: "PayPal", description: "Accept PayPal and Venmo payments from customers worldwide with buyer protection.", icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
      { id: 3, name: "Mobile Money", description: "Accept mobile money payments via MTN MoMo, Vodafone Cash, and AirtelTigo for local transactions.", icon: Smartphone, color: "text-yellow-500", bg: "bg-yellow-50" },
    ],
  },
  {
    name: "Accounting",
    integrations: [
      { id: 4, name: "QuickBooks", description: "Sync invoices, payments, and financial reports automatically with QuickBooks Online.", icon: Calculator, color: "text-emerald-500", bg: "bg-emerald-50" },
      { id: 5, name: "Xero", description: "Cloud accounting — track expenses, payroll, and bank reconciliation in real time.", icon: Calculator, color: "text-blue-500", bg: "bg-blue-50" },
    ],
  },
  {
    name: "Email & SMS",
    integrations: [
      { id: 6, name: "SendGrid", description: "Transactional and marketing email delivery with open/click analytics and templates.", icon: Send, color: "text-blue-400", bg: "bg-blue-50" },
      { id: 7, name: "Twilio", description: "Send and receive SMS notifications, alerts, and two-way messaging at scale.", icon: MessageSquare, color: "text-red-500", bg: "bg-red-50" },
    ],
  },
  {
    name: "Cloud Storage",
    integrations: [
      { id: 8, name: "Google Drive", description: "Store and sync project documents, blueprints, and contracts in Google Drive.", icon: Cloud, color: "text-green-500", bg: "bg-green-50" },
      { id: 9, name: "Dropbox", description: "Cloud file storage for project documents with version history and sharing.", icon: Cloud, color: "text-blue-500", bg: "bg-blue-50" },
      { id: 10, name: "OneDrive", description: "Microsoft cloud storage integration for seamless Office document collaboration.", icon: Cloud, color: "text-blue-600", bg: "bg-blue-50" },
    ],
  },
  {
    name: "Calendar",
    integrations: [
      { id: 11, name: "Google Calendar", description: "Sync project deadlines, site visits, and meetings with Google Calendar.", icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
      { id: 12, name: "Outlook", description: "Sync appointments, deadlines, and team schedules with Microsoft Outlook.", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    ],
  },
  {
    name: "Maps & Location",
    integrations: [
      { id: 13, name: "Google Maps", description: "Property location mapping, geocoding, directions, and neighborhood data.", icon: MapPin, color: "text-green-600", bg: "bg-green-50" },
      { id: 14, name: "Mapbox", description: "Custom map styling, satellite imagery, and geospatial analysis for property sites.", icon: MapPin, color: "text-blue-700", bg: "bg-blue-50" },
    ],
  },
  {
    name: "Communication",
    integrations: [
      { id: 15, name: "WhatsApp Business", description: "Send property updates, payment reminders, and client messages via WhatsApp.", icon: MessageSquare, color: "text-green-600", bg: "bg-green-50" },
      { id: 16, name: "Telegram", description: "Automated notifications and alerts for project milestones and team updates.", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50" },
    ],
  },
]

export default function IntegrationsPage() {
  const allIntegrations = categories.flatMap(c => c.integrations)

  return (
    <div className="space-y-6">
      <PageHeader title="System Integrations" description="Third-party services and APIs planned for future releases" />

      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <Clock className="h-4 w-4 shrink-0" />
        All integrations below are planned and under active development. No external services are connected yet.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Link2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{allIntegrations.length}</p>
              <p className="text-xs text-slate-500">Planned Integrations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{allIntegrations.length}</p>
              <p className="text-xs text-slate-500">Coming in v2.0</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
              <Settings className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
              <p className="text-xs text-slate-500">Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
              <Zap className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-400">0</p>
              <p className="text-xs text-slate-500">Currently Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {categories.map((cat) => (
        <div key={cat.name}>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">{cat.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cat.integrations.map((integ) => {
              const Icon = integ.icon
              return (
                <Card key={integ.id} className="hover:shadow-md transition-shadow opacity-80">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${integ.bg}`}>
                        <Icon className={`h-6 w-6 ${integ.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-slate-900">{integ.name}</h3>
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            <Globe className="h-3 w-3" />
                            Planned
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{integ.description}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>Coming in v2.0</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
