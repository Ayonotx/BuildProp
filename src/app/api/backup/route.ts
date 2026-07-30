export const dynamic = 'force-dynamic'

import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const backupsDir = join(process.cwd(), 'data', 'backups')
const dbPath = join(process.cwd(), 'prisma', 'dev.db')

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function POST() {
  try {
    await mkdir(backupsDir, { recursive: true })

    const dbBuffer = await readFile(dbPath)
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '.').slice(0, 19)
    const backupFilename = `buildprop-backup-${timestamp}.db`
    const backupPath = join(backupsDir, backupFilename)

    await writeFile(backupPath, dbBuffer)

    // Create JSON export of major tables
    const [projects, properties, contacts, invoices, payments, inventoryItems, employees] =
      await Promise.all([
        prisma.project.findMany().catch(() => []),
        prisma.property.findMany().catch(() => []),
        prisma.contact.findMany().catch(() => []),
        prisma.invoice.findMany().catch(() => []),
        prisma.payment.findMany().catch(() => []),
        prisma.inventoryItem.findMany().catch(() => []),
        prisma.employee.findMany().catch(() => []),
      ])

    const jsonExport = {
      exportedAt: new Date().toISOString(),
      tables: {
        projects,
        properties,
        contacts,
        invoices,
        payments,
        inventory: inventoryItems,
        employees,
      },
    }

    const jsonFilename = backupFilename.replace('.db', '.json')
    const jsonPath = join(backupsDir, jsonFilename)
    await writeFile(jsonPath, JSON.stringify(jsonExport, null, 2))

    const stats = await stat(backupPath)

    // Audit log
    try {
      await logAudit('backup', 'database', `Backup created: ${backupFilename}`)
    } catch {}

    return Response.json({
      success: true,
      backup: {
        filename: backupFilename,
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        jsonExport: jsonFilename,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    await mkdir(backupsDir, { recursive: true })

    const files = await readdir(backupsDir)
    const dbFiles = files.filter(f => f.endsWith('.db'))

    const backups = await Promise.all(
      dbFiles.map(async (filename) => {
        const filePath = join(backupsDir, filename)
        const fileStat = await stat(filePath)
        return {
          filename,
          size: fileStat.size,
          sizeFormatted: formatSize(fileStat.size),
          createdAt: fileStat.mtime.toISOString(),
        }
      })
    )

    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return Response.json({ backups })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
