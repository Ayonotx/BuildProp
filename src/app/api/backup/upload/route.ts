export const dynamic = 'force-dynamic'

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const backupsDir = join(process.cwd(), 'data', 'backups')

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filename = formData.get('filename') as string | null

    if (!file || !filename) {
      return Response.json({ error: 'Missing file or filename' }, { status: 400 })
    }

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 })
    }

    await mkdir(backupsDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = join(backupsDir, filename)
    await writeFile(filePath, buffer)

    return Response.json({ success: true, filename })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
