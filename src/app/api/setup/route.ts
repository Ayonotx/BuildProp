export const dynamic = 'force-dynamic'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

const settingsPath = join(process.cwd(), 'data', 'settings.json')

// Side-effect free: this handler MUST NOT write any files or return demo data.
// configured = settings.json has a companyName OR the DB has at least one user.
export async function GET() {
  let configured = false

  try {
    const content = await readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(content)
    if (settings && settings.companyName) {
      configured = true
    }
  } catch {
    // settings.json missing or unreadable — fall through to DB check
  }

  if (!configured) {
    try {
      const userCount = await prisma.user.count()
      if (userCount > 0) {
        configured = true
      }
    } catch {
      // DB might not be available — keep current configured state
    }
  }

  return Response.json({ configured })
}
