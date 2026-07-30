export const dynamic = 'force-dynamic'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

const settingsPath = join(process.cwd(), 'data', 'settings.json')

export async function GET() {
  try {
    const content = await readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(content)
    if (settings.companyName) {
      return Response.json({ configured: true })
    }
  } catch {
    // File doesn't exist
  }

  try {
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      const dir = join(process.cwd(), 'data')
      await mkdir(dir, { recursive: true })
      const defaultSettings = {
        companyName: "BuildProp Construction",
        address: "123 Airport Road, Accra, Ghana",
        phone: "+233 24 123 4567",
        email: "info@buildprop.com",
        website: "https://buildprop.com",
        timezone: "Africa/Accra",
        currency: "GHS",
        dateFormat: "DD/MM/YYYY",
        adminName: "Admin",
        adminEmail: "admin@buildprop.com",
      }
      await writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2))
      return Response.json({ configured: true })
    }
  } catch {
    // DB might not be available
  }

  return Response.json({ configured: false })
}
