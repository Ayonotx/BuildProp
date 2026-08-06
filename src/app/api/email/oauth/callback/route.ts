export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import {
  loadEmailSettings,
  saveEmailSettings,
  exchangeGoogleAuthCode,
  fetchGoogleEmail,
  getGoogleCredentials,
  escapeHtml,
  type EmailSettings,
} from '@/lib/email'

/**
 * Google redirects here after the user authorizes. Public endpoint
 * (see PUBLIC_PATHS in src/proxy.ts). Exchanges the authorization code for
 * tokens, stores them in data/email.json (merging any existing SMTP settings)
 * and renders a small HTML result page that the user can close.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const error = searchParams.get('error')
    if (error) {
      if (error === 'access_denied') {
        return renderPage('Sign-in cancelled', 'You can close this window and return to BuildProp.', 'info')
      }
      return renderPage('Sign-in failed', `Google returned an error: ${error}. Please try again.`, 'error')
    }

    const code = searchParams.get('code')
    if (!code) {
      return renderPage('Missing authorization code', 'Google did not return an authorization code. Please try again.', 'error')
    }

    const exchanged = await exchangeGoogleAuthCode(code)
    if (!exchanged || !exchanged.accessToken) {
      return renderPage('Could not connect Gmail', 'Google rejected the authorization. Please close this window and try signing in again.', 'error')
    }

    const creds = getGoogleCredentials()
    const clientId = creds?.clientId || ''
    const clientSecret = creds?.clientSecret || ''

    // Fetching the account email is optional — never fatal.
    let googleEmail = ''
    try {
      googleEmail = await fetchGoogleEmail(exchanged.accessToken)
    } catch {}

    const existing = await loadEmailSettings()
    const merged: EmailSettings = {
      ...existing,
      emailProvider: 'google',
      googleClientId: clientId,
      googleClientSecret: clientSecret,
      googleRefreshToken: exchanged.refreshToken,
      googleAccessToken: exchanged.accessToken,
      googleTokenExpiresAt: Date.now() + exchanged.expiresIn * 1000,
      googleEmail: googleEmail || existing.googleEmail,
      fromEmail: existing.fromEmail || googleEmail || existing.googleEmail || '',
    }
    await saveEmailSettings(merged)

    return renderPage('Gmail connected', 'You can close this window and return to BuildProp.', 'success')
  } catch (error) {
    console.error('[Email] OAuth callback failed:', error)
    return renderPage('Could not connect Gmail', 'An unexpected error occurred while saving your Google connection. Please try again.', 'error')
  }
}

function renderPage(title: string, message: string, kind: 'success' | 'error' | 'info'): Response {
  const color = kind === 'success' ? '#22c55e' : kind === 'error' ? '#ef4444' : '#94a3b8'
  const icon = kind === 'success'
    ? '<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
    : kind === 'error'
      ? '<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      : '<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'

  const html =
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '  <meta charset="utf-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '  <title>' + escapeHtml(title) + '</title>\n' +
    '</head>\n' +
    '<body style="margin:0;background:#0b1220;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;">\n' +
    '  <div style="text-align:center;padding:24px;max-width:440px;">\n' +
    '    <div style="font-size:30px;font-weight:700;letter-spacing:0.5px;color:#ffffff;margin-bottom:30px;">BuildProp</div>\n' +
    '    <div style="width:76px;height:76px;border-radius:50%;background:rgba(34,197,94,0.10);display:flex;align-items:center;justify-content:center;margin:0 auto 22px;">' + icon + '</div>\n' +
    '    <div style="font-size:20px;font-weight:600;color:#ffffff;margin-bottom:10px;">' + escapeHtml(title) + '</div>\n' +
    '    <div style="font-size:15px;color:#94a3b8;line-height:1.6;">' + escapeHtml(message) + '</div>\n' +
    '  </div>\n' +
    '</body>\n' +
    '</html>'

  return new Response(html, {
    status: kind === 'error' ? 500 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
