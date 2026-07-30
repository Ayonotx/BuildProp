import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const logPath = join(process.cwd(), 'data', 'audit-log.json')

export interface AuditEntry {
  id: string
  timestamp: string
  userId: string
  action: string
  resource: string
  details: string
  ipAddress?: string
}

export async function logAudit(
  action: string,
  resource: string,
  details: string,
  userId?: string,
  ipAddress?: string
): Promise<void> {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: userId || 'system',
    action,
    resource,
    details,
    ipAddress,
  }

  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true })
    let log: AuditEntry[] = []
    try {
      const content = await readFile(logPath, 'utf-8')
      log = JSON.parse(content)
    } catch {}
    log.push(entry)
    await writeFile(logPath, JSON.stringify(log, null, 2))
  } catch {
    // Silently fail to avoid disrupting main operations
  }
}
