export const dynamic = 'force-dynamic'

import { readFile } from 'fs/promises'
import { join } from 'path'
import { logAudit } from '@/lib/audit'

const logPath = join(process.cwd(), 'data', 'audit-log.json')

export async function GET() {
  try {
    const content = await readFile(logPath, 'utf-8')
    const log = JSON.parse(content)
    return Response.json(log)
  } catch {
    return Response.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, resource, details, userId, ipAddress } = body

    if (!action || !resource || !details) {
      return Response.json({ error: 'action, resource, and details are required' }, { status: 400 })
    }

    await logAudit(action, resource, details, userId, ipAddress)
    return Response.json({ success: true }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
