import { promises as fs } from 'fs'
import { join } from 'path'
import { networkInterfaces } from 'os'
import { execFile } from 'child_process'
import { randomBytes } from 'crypto'

export interface PairingSession {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
  used: boolean
}

interface PairingStore {
  sessions: PairingSession[]
}

const PAIRING_TTL_MS = 5 * 60 * 1000

function pairingPath(): string {
  return join(process.cwd(), 'data', 'pairing.json')
}

async function loadPairingStore(): Promise<PairingStore> {
  try {
    const raw = await fs.readFile(pairingPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<PairingStore>
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] }
  } catch {
    return { sessions: [] }
  }
}

async function savePairingStore(store: PairingStore): Promise<void> {
  await fs.mkdir(join(process.cwd(), 'data'), { recursive: true })
  await fs.writeFile(pairingPath(), JSON.stringify(store, null, 2), 'utf-8')
}

function isExpired(session: PairingSession): boolean {
  return Date.parse(session.expiresAt) <= Date.now()
}

export async function createPairing(userId: string): Promise<PairingSession> {
  const store = await loadPairingStore()
  store.sessions = store.sessions.filter((s) => !isExpired(s))
  const now = new Date()
  const session: PairingSession = {
    token: randomBytes(12).toString('hex'),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PAIRING_TTL_MS).toISOString(),
    used: false,
  }
  store.sessions.push(session)
  await savePairingStore(store)
  return session
}

export async function consumePairing(
  token: string
): Promise<{ userId: string; session: PairingSession } | null> {
  const store = await loadPairingStore()
  store.sessions = store.sessions.filter((s) => !isExpired(s))
  const session = store.sessions.find((s) => s.token === token)
  if (!session || session.used) {
    await savePairingStore(store)
    return null
  }
  session.used = true
  await savePairingStore(store)
  return { userId: session.userId, session }
}

// Built at runtime so the build-time file tracer sees no absolute-path string
// literals (nft scans string literals for paths and was copying the repo root).
const TAILSCALE_EXE_CANDIDATES = (function () {
  const pf = process.env['ProgramFiles'] || process.env['PROGRAMFILES'] || 'C:\\Program Files'
  const tailscaleName = 'tailscale' + '.exe'
  return [tailscaleName, require('path').join(pf, 'Tailscale', tailscaleName)]
})()

function runTailscale(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const tryNext = (index: number) => {
      if (index >= TAILSCALE_EXE_CANDIDATES.length) {
        resolve('')
        return
      }
      execFile(
        TAILSCALE_EXE_CANDIDATES[index],
        args,
        { timeout: 5000, windowsHide: true },
        (error, stdout) => {
          if (error || !stdout) {
            tryNext(index + 1)
            return
          }
          resolve(stdout.trim())
        }
      )
    }
    tryNext(0)
  })
}

// Returns the Tailscale IPv4 (100.x.x.x) when the Tailscale client is
// installed and connected; otherwise an empty string.
export async function getTailscaleIp(): Promise<string> {
  const out = await runTailscale(['ip', '-4'])
  const ip = out.split(/\s+/)[0] || ''
  return ip.startsWith('100.') ? ip : ''
}

// First reachable non-internal IPv4 on the machine (LAN fallback).
export function getLanIpv4(): string {
  const interfaces = networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name] || []
    for (const iface of ifaces) {
      const isIpv4 = iface.family === 'IPv4'
      if (!isIpv4 || iface.internal) continue
      if (iface.address.startsWith('100.') || iface.address.startsWith('127.')) continue
      return iface.address
    }
  }
  return '127.0.0.1'
}

// The address the PHONE dials. Prefers the Tailscale IP (works from anywhere);
// otherwise falls back to the first LAN IPv4 (same Wi-Fi).
export async function resolveServerUrl(): Promise<{
  serverUrl: string
  tailscaleIp: string
}> {
  const port = process.env.BUILDPROP_PORT || '3456'
  const tailscaleIp = await getTailscaleIp()
  if (tailscaleIp) {
    return { serverUrl: `http://${tailscaleIp}:${port}`, tailscaleIp }
  }
  return { serverUrl: `http://${getLanIpv4()}:${port}`, tailscaleIp: '' }
}

// Locates the app's resources directory (contains tools/tailscale-setup.msi).
// Prefers BUILDPROP_RESOURCES_DIR (set by electron/main.js); in dev the tools
// live in electron/resources; in the packaged standalone the server runs from
// <resources>/.next/standalone so the resources dir is two levels up.
export function resolveResourcesDir(): string {
  // Paths are computed in electron/main.js and passed via env vars. Keeping any
  // "electron"/"resources"/"tools" string literals out of this file prevents
  // Next's build-time file tracer (@vercel/nft) from copying repo folders
  // (electron/, dist/, ...) into .next/standalone (8GB balloon bug).
  return process.env.BUILDPROP_RESOURCES_DIR || ''
}
