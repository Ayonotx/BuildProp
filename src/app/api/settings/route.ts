export const dynamic = 'force-dynamic'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { settingsSchema } from '@/lib/validations'
import { withValidation } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'
import { logAudit } from '@/lib/audit'

const settingsPath = join(process.cwd(), 'data', 'settings.json')

export async function GET() {
  try {
    const content = await readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(content)
    return Response.json(settings)
  } catch {
    return Response.json({ configured: false })
  }
}

export const POST = withValidation(settingsSchema, async (request, body) => {
  try {
    let existing = {}
    try {
      const content = await readFile(settingsPath, 'utf-8')
      existing = JSON.parse(content)
    } catch {
      // No existing settings file
    }

    await mkdir(join(process.cwd(), 'data'), { recursive: true })

    const settings = {
      ...existing,
      ...body,
      configured: true,
      configuredAt: new Date().toISOString(),
    }

    await writeFile(settingsPath, JSON.stringify(settings, null, 2))

    // Audit log
    try {
      await logAudit('settings_change', 'settings', 'System settings were updated')
    } catch {}

    return Response.json({ success: true, settings })
  } catch (error) {
    return handleApiError(error)
  }
})
