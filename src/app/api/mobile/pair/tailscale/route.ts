export const dynamic = 'force-dynamic'
import { execFile } from 'child_process'
import { handleApiError } from '@/lib/api-errors'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

function runMsiexec(msiPath: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    execFile(
      'msiexec',
      ['/i', msiPath, '/quiet'],
      { timeout: 300000, windowsHide: true },
      (error) => {
        if (error) {
          resolve({ success: false, message: error.message })
        } else {
          resolve({ success: true, message: 'Tailscale installer launched. Approve the Windows prompt to finish.' })
        }
      }
    )
  })
}

export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isAdminRole(currentUser.role.name)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const msiPath = process.env.BUILDPROP_TAILSCALE_MSI || ''
    if (!msiPath) {
      return Response.json({ success: false, message: 'Tailscale installer not found on this machine.' }, { status: 400 })
    }
    const result = await runMsiexec(msiPath)

    try {
      await logAudit('mobile_tailscale_install', 'settings', 'Tailscale installer launched', currentUser.id)
    } catch {}

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
