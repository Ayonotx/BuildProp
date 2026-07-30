export const dynamic = 'force-dynamic'

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const sessionsPath = join(process.cwd(), 'data', 'sessions.json')

export interface SessionEntry {
  id: string
  userId: string
  loginTime: string
  ip: string
  userAgent: string
  expiresAt: string
}

async function readSessions(): Promise<SessionEntry[]> {
  try {
    const content = await readFile(sessionsPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

async function writeSessions(sessions: SessionEntry[]): Promise<void> {
  await mkdir(join(process.cwd(), 'data'), { recursive: true })
  await writeFile(sessionsPath, JSON.stringify(sessions, null, 2))
}

export async function GET() {
  try {
    const sessions = await readSessions()
    return Response.json(sessions)
  } catch {
    return Response.json([])
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return Response.json({ error: 'Session id is required' }, { status: 400 })
    }

    const sessions = await readSessions()
    const filtered = sessions.filter((s) => s.id !== sessionId)

    if (filtered.length === sessions.length) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    await writeSessions(filtered)
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
