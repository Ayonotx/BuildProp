export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const sessionsPath = join(process.cwd(), 'data', 'sessions.json')

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true })
  response.cookies.set('buildprop_token', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
  })

  // Remove active sessions and log audit
  try {
    let sessions: any[] = []
    try {
      const content = await readFile(sessionsPath, 'utf-8')
      sessions = JSON.parse(content)
    } catch {}

    if (sessions.length > 0) {
      // Clear all sessions on logout (could be refined to only current session)
      await writeFile(sessionsPath, JSON.stringify([], null, 2))
    }

    await logAudit('logout', 'auth', 'User logged out')
  } catch {}

  return response
}
