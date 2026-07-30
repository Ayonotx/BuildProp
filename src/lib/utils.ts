import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', GHS: 'GH₵', NGN: '₦', GBP: '£', EUR: '€', ZAR: 'R', KES: 'KSh',
}

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US', GHS: 'en-GH', NGN: 'en-NG', GBP: 'en-GB', EUR: 'de-DE', ZAR: 'en-ZA', KES: 'en-KE',
}

export function getCurrency(): string {
  if (typeof window === 'undefined') return 'GHS'
  try {
    const stored = localStorage.getItem("buildprop_settings")
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.currency || "GHS"
    }
  } catch {}
  return "GHS"
}

export function formatCurrency(amount: number | string, currency?: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  const curr = currency || getCurrency()
  const locale = CURRENCY_LOCALES[curr] || 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num)
  } catch {
    const symbol = CURRENCY_SYMBOLS[curr] || '$'
    return `${symbol}${(isNaN(num) ? 0 : num).toLocaleString()}`
  }
}

export function formatMoney(val: number, currency?: string): string {
  return formatCurrency(val, currency)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  if (isNaN(d.getTime())) return "Invalid date"

  let format = 'DD/MM/YYYY'
  try {
    const stored = localStorage.getItem('buildprop_settings')
    if (stored) {
      const settings = JSON.parse(stored)
      if (settings.dateFormat) format = settings.dateFormat
    }
  } catch {}

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  switch (format) {
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`
    case 'DD/MM/YYYY':
    default: return `${day}/${month}/${year}`
  }
}

export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function statusVariant(s: string): "success" | "destructive" | "warning" | "default" | "secondary" {
  const normalized = s.toLowerCase()
  if (["completed", "active", "approved", "available", "paid", "open", "resolved", "delivered", "published"].includes(normalized)) return "success"
  if (["cancelled", "rejected", "failed", "overdue", "inactive", "sold", "terminated", "expired", "blocked"].includes(normalized)) return "destructive"
  if (["pending", "in_progress", "on_hold", "reserved", "under_review", "processing"].includes(normalized)) return "warning"
  if (["planning", "todo", "draft", "new", "open"].includes(normalized)) return "default"
  return "secondary"
}

export function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function priorityVariant(p: string): "destructive" | "warning" | "secondary" {
  const normalized = p.toLowerCase()
  if (["high", "critical", "urgent"].includes(normalized)) return "destructive"
  if (["medium", "normal"].includes(normalized)) return "warning"
  return "secondary"
}

export function toNum(val: string | number): number {
  if (typeof val === "number") return val
  const parsed = parseFloat(val)
  return isNaN(parsed) ? 0 : parsed
}
