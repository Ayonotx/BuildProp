export const dynamic = 'force-dynamic'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST() {
  try {
    if (process.env.DEMO_MODE !== 'true') {
      return Response.json({ error: 'Not available' }, { status: 403 })
    }

    const source = join(process.cwd(), 'prisma', 'demo.db')
    const target = join(process.cwd(), 'prisma', 'dev.db')

    if (!existsSync(source)) {
      return Response.json(
        { error: 'Demo database file not found. Reinstall the demo or restore from backup.' },
        { status: 500 }
      )
    }

    try {
      await prisma.$disconnect()
    } catch {
      // continue even if disconnect fails (Windows file locks)
    }

    let copied = false
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        copyFileSync(source, target)
        copied = true
        break
      } catch {
        if (attempt < 4) await sleep(300)
      }
    }

    if (!copied) {
      return Response.json(
        { error: 'Failed to reset the demo database. Close other connections and try again.' },
        { status: 500 }
      )
    }

    return Response.json({ success: true, message: 'Demo data reset complete.' })
  } catch (error) {
    return handleApiError(error)
  }
}
