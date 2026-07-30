export const dynamic = 'force-dynamic'

import { copyFile, access } from 'fs/promises'
import { join } from 'path'
import { logAudit } from '@/lib/audit'

const backupsDir = join(process.cwd(), 'data', 'backups')
const dbPath = join(process.cwd(), 'prisma', 'dev.db')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { filename } = body

    if (!filename || typeof filename !== 'string') {
      return Response.json({ error: 'Missing backup filename' }, { status: 400 })
    }

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const backupPath = join(backupsDir, filename)

    try {
      await access(backupPath)
    } catch {
      return Response.json({ error: 'Backup file not found' }, { status: 404 })
    }

    await copyFile(backupPath, dbPath)

    // Audit log
    try {
      await logAudit('restore', 'database', `Database restored from backup: ${filename}`)
    } catch {}

    return Response.json({
      success: true,
      message: 'Database restored successfully. Please restart the application for changes to take effect.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
