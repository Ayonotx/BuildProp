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
  // 'smtp' (manual SMTP, default) or 'google' (OAuth2 via Gmail).
  // Optional so pre-existing EmailSettings literals (settings POST route) and
  // older email.json files remain valid; loadEmailSettings always fills them.
  emailProvider?: string
  googleClientId?: string
  googleClientSecret?: string
  googleRefreshToken?: string
  googleAccessToken?: string
  googleTokenExpiresAt?: number
  googleEmail?: string
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

export interface GoogleOAuthStatus {
  connected: boolean
  email?: string
}

const DEFAULT_SETTINGS: EmailSettings = {
  host: '',
  port: 465,
  secure: true,
  user: '',
  password: '',
  fromName: '',
  fromEmail: '',
  emailProvider: 'smtp',
  googleClientId: '',
  googleClientSecret: '',
  googleRefreshToken: '',
  googleAccessToken: '',
  googleTokenExpiresAt: 0,
  googleEmail: '',
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

export type SanitizedEmailSettings = Omit<
  EmailSettings,
  'password' | 'googleClientId' | 'googleClientSecret' | 'googleRefreshToken' | 'googleAccessToken' | 'googleTokenExpiresAt'
> & {
  googleAvailable: boolean
  googleConnected: boolean
}

// Removes the SMTP password and Google OAuth secrets before sending settings
// back to the client. Adds computed flags for the Settings UI.
export function sanitizeEmailSettings(settings: EmailSettings): SanitizedEmailSettings {
  const sanitized = { ...settings } as Partial<EmailSettings>
  delete sanitized.password
  delete sanitized.googleClientId
  delete sanitized.googleClientSecret
  delete sanitized.googleRefreshToken
  delete sanitized.googleAccessToken
  delete sanitized.googleTokenExpiresAt
  const status = getGoogleOAuthStatus(settings)
  return {
    ...(sanitized as Omit<
      EmailSettings,
      'password' | 'googleClientId' | 'googleClientSecret' | 'googleRefreshToken' | 'googleAccessToken' | 'googleTokenExpiresAt'
    >),
    googleAvailable: getGoogleCredentials() !== null,
    googleConnected: status.connected,
  }
}

export function isEmailConfigured(settings: EmailSettings): boolean {
  const fromEmail = settings.fromEmail || settings.googleEmail
  return Boolean(fromEmail && (settings.host || settings.googleRefreshToken))
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

// === Google OAuth (Gmail) helpers =========================================

// Reads the vendor-configured Google OAuth app credentials from env. Returns
// null when either value is missing so callers can report "not configured".
export function getGoogleCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function googleOAuthRedirectUri(): string {
  const port = process.env.BUILDPROP_PORT || '3456'
  return `http://localhost:${port}/api/email/oauth/callback`
}

// The Google authorization URL opened in the user's browser. Null when the
// vendor has not configured GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
export function buildGoogleAuthUrl(): string | null {
  const creds = getGoogleCredentials()
  if (!creds) return null
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: googleOAuthRedirectUri(),
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export function getGoogleOAuthStatus(settings: EmailSettings): GoogleOAuthStatus {
  return {
    connected: Boolean(settings.googleRefreshToken),
    email: settings.googleEmail || undefined,
  }
}

// Exchanges the one-time authorization code from the OAuth callback for
// Google access + refresh tokens. Returns null on any failure.
export async function exchangeGoogleAuthCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  const creds = getGoogleCredentials()
  if (!creds) return null
  try {
    const body = new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: googleOAuthRedirectUri(),
      grant_type: 'authorization_code',
    })
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data.access_token !== 'string' || !data.access_token) return null
    return {
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : '',
      expiresIn: Number(data.expires_in) || 3600,
    }
  } catch {
    return null
  }
}

// Fetches the account's Gmail address with the access token. Non-fatal.
export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return ''
    const data = await res.json()
    return typeof data.email === 'string' ? data.email : ''
  } catch {
    return ''
  }
}

// Refreshes an expired Google access token using the stored refresh token and
// persists the new access token + expiry. Returns the fresh token or null.
export async function refreshGoogleAccessToken(settings: EmailSettings): Promise<string | null> {
  const clientId = settings.googleClientId || process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = settings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || ''
  if (!settings.googleRefreshToken || !clientId || !clientSecret) return null
  try {
    const body = new URLSearchParams({
      refresh_token: settings.googleRefreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    })
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) return null
    const data = await res.json()
    const accessToken = typeof data.access_token === 'string' ? data.access_token : ''
    if (!accessToken) return null
    settings.googleAccessToken = accessToken
    settings.googleTokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000
    try {
      await saveEmailSettings(settings)
    } catch {}
    return accessToken
  } catch {
    return null
  }
}

// Sends via smtp.gmail.com using XOAUTH2. Refreshes the access token first if
// it is expired. Throws on failure (callers catch and report).
export async function sendMailViaGoogle(settings: EmailSettings, mailOptions: SendMailInput): Promise<unknown> {
  let accessToken = settings.googleAccessToken || ''
  const expiresAt = Number(settings.googleTokenExpiresAt || 0)
  if (!accessToken || expiresAt < Date.now()) {
    const fresh = await refreshGoogleAccessToken(settings)
    if (fresh) accessToken = fresh
  }
  if (!accessToken) {
    throw new Error('Google access token is missing or could not be refreshed.')
  }

  const clientId = settings.googleClientId || process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = settings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || ''
  const fromEmail = settings.googleEmail || settings.fromEmail

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: settings.googleEmail || '',
      clientId,
      clientSecret,
      refreshToken: settings.googleRefreshToken || '',
      accessToken,
    },
  })

  return transporter.sendMail({
    from: settings.fromName ? `"${settings.fromName}" <${fromEmail}>` : fromEmail,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
    text: mailOptions.text || (mailOptions.html ? mailOptions.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
  })
}

export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<SendMailResult> {
  try {
    const settings = await loadEmailSettings()
    const googleStatus = getGoogleOAuthStatus(settings)

    // Prefer Google when explicitly selected, or when Google tokens exist and
    // no manual SMTP host has been configured.
    const useGoogle = settings.emailProvider === 'google' || (googleStatus.connected && !settings.host)

    const fromEmail = settings.fromEmail || settings.googleEmail
    if (!fromEmail || (!useGoogle && !settings.host)) {
      return { success: false, message: 'Email is not configured' }
    }

    if (useGoogle) {
      await sendMailViaGoogle(settings, { to, subject, html, text })
    } else {
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
        from: settings.fromName ? `"${settings.fromName}" <${fromEmail}>` : fromEmail,
        to,
        subject,
        html,
        text: text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
      })
    }

    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    console.error('[Email] send failed:', error)
    return { success: false, message }
  }
}
