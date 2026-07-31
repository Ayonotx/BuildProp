export const dynamic = 'force-dynamic'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { settingsSchema } from '@/lib/validations'
import { withValidation } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

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
    // RBAC: on a fresh install (0 users) the setup wizard may save settings
    // without a session. Once any user exists, only Super Admin/Admin may update
    // settings. Enforcement lives here (the proxy lets POST /api/settings through
    // so the first-run wizard works).
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      const currentUser = await getCurrentUser()
      if (!currentUser || !isAdminRole(currentUser.role.name)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    let existing = {}
    try {
      const content = await readFile(settingsPath, 'utf-8')
      existing = JSON.parse(content)
    } catch {
      // No existing settings file
    }

    await mkdir(join(process.cwd(), 'data'), { recursive: true })

    // Never persist the admin account fields to settings.json — the password
    // must only live as a hash in the DB.
    const { adminEmail, adminPassword, adminFirstName, adminLastName, ...settingsBody } = body

    const settings = {
      ...existing,
      ...settingsBody,
      configured: true,
      configuredAt: new Date().toISOString(),
    }

    await writeFile(settingsPath, JSON.stringify(settings, null, 2))

    // Audit log
    try {
      await logAudit('settings_change', 'settings', 'System settings were updated')
    } catch {}

    // First-run: create the initial Super Admin (idempotent — only when the DB
    // has zero users, so subsequent saves never create additional admins).
    if (userCount === 0) {
      if (!adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
        return Response.json(
          { error: 'Admin account details (firstName, lastName, email, password) are required on first setup' },
          { status: 400 }
        )
      }

      let role = await prisma.role.findFirst({ where: { name: 'Super Admin' } })
      if (!role) {
        role = await prisma.role.findFirst({ orderBy: { level: 'desc' } })
      }
      if (!role) {
        return Response.json({ error: 'No role available to assign to the admin user' }, { status: 500 })
      }

      const passwordHash = await hashPassword(adminPassword)
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail.toLowerCase(),
          passwordHash,
          firstName: adminFirstName,
          lastName: adminLastName,
          roleId: role.id,
        },
      })

      try {
        await logAudit('user_create', 'users', `Created initial Super Admin ${adminUser.email} during first-run setup`, adminUser.id)
      } catch {}
    }

    return Response.json({ success: true, settings })
  } catch (error) {
    return handleApiError(error)
  }
})
