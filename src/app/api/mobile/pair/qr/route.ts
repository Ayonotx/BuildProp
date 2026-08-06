export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { createPairing, resolveServerUrl } from '@/lib/pairing'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

/**
 * Generates a short-lived one-time pairing session for the BuildProp mobile app
 * and returns the ready-to-render QR payload. Shares the same persistence
 * (data/pairing.json, via createPairing) as POST /api/mobile/pair/start, so the
 * token can be confirmed by either flow.
 *
 * Request (authenticated admin session; enforced by src/proxy.ts):
 *   POST /api/mobile/pair/qr
 *
 * Response:
 *   { success, v: 1, s: "<serverUrl>", k: "<pairToken>", expiresAt }
 *
 * The desktop UI renders this object as the QR payload Ã¢â‚¬â€ the phone scans it and
 * calls POST /api/mobile/pair/confirm with { token: k }.
 */
import QRCode from 'qrcode'

async function generatePairing() {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (!isAdminRole(currentUser.role.name)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const session = await createPairing(currentUser.id)
  const { serverUrl, tailscaleIp, lanUrl } = await resolveServerUrl()

  // QR payload format consumed by the mobile app's scanner / manual paste.
  // s2 = fallback LAN address when s is the Tailscale address (phone tries both).
  const payload = JSON.stringify({ v: 1, s: serverUrl, s2: lanUrl !== serverUrl ? lanUrl : undefined, k: session.token })
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 512, margin: 2 })

  try {
    await logAudit('mobile_pair_qr', 'settings', 'Mobile pairing QR code generated', currentUser.id)
  } catch {}

  return Response.json({
    success: true,
    v: 1,
    s: serverUrl,
    s2: lanUrl !== serverUrl ? lanUrl : undefined,
    k: session.token,
    token: session.token,
    expiresAt: session.expiresAt,
    qrDataUrl,
    serverUrl,
    tailscaleInstalled: !!tailscaleIp,
    tailscaleIp,
  })
}

// The desktop Settings page fetches this with GET; the mobile/start flow uses POST.
export const GET = generatePairing
export const POST = generatePairing
