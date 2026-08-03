import { promises as fs } from 'fs'
import { join } from 'path'
import nodemailer from 'nodemailer'

export interface EmailSettings {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName: string
  fromEmail: string
}

export interface SendMailInput {
  to: string
  subject: string
  html?: string
  text?: string
}

export interface SendMailResult {
  success: boolean
  message: string
}

const DEFAULT_SETTINGS: EmailSettings = {
  host: '',
  port: 465,
  secure: true,
  user: '',
  password: '',
  fromName: '',
  fromEmail: '',
}

function emailPath(): string {
  return join(process.cwd(), 'data', 'email.json')
}

export async function loadEmailSettings(): Promise<EmailSettings> {
  try {
    const raw = await fs.readFile(emailPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<EmailSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveEmailSettings(settings: EmailSettings): Promise<void> {
  await fs.mkdir(join(process.cwd(), 'data'), { recursive: true })
  await fs.writeFile(emailPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

// Removes the SMTP password before sending settings back to the client.
export function sanitizeEmailSettings(settings: EmailSettings): Omit<EmailSettings, 'password'> {
  const sanitized = { ...settings } as Partial<EmailSettings>
  delete sanitized.password
  return sanitized as Omit<EmailSettings, 'password'>
}

export function isEmailConfigured(settings: EmailSettings): boolean {
  return Boolean(settings.host && settings.fromEmail)
}

// Resolves the default port for a given secure flag (465 for SSL, 587 for STARTTLS).
export function defaultPortFor(secure: boolean): number {
  return secure ? 465 : 587
}

// Reads the company name + currency from data/settings.json for email content.
export async function loadCompanySettings(): Promise<{ companyName: string; currency: string }> {
  try {
    const raw = await fs.readFile(join(process.cwd(), 'data', 'settings.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      companyName: parsed.companyName || 'BuildProp',
      currency: parsed.currency || 'GHS',
    }
  } catch {
    return { companyName: 'BuildProp', currency: 'GHS' }
  }
}

export function formatAmount(amount: number | string, currency = 'GHS'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num)
  } catch {
    return `${currency} ${(isNaN(num) ? 0 : num).toLocaleString()}`
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<SendMailResult> {
  try {
    const settings = await loadEmailSettings()

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.password,
      },
    })

    await transporter.sendMail({
      from: settings.fromName
        ? `"${settings.fromName}" <${settings.fromEmail}>`
        : settings.fromEmail,
      to,
      subject,
      html,
      text: text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
    })

    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    console.error('[Email] send failed:', error)
    return { success: false, message }
  }
}
