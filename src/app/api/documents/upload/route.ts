export const dynamic = 'force-dynamic'

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'data', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    await writeFile(join(uploadDir, filename), buffer)

    return Response.json({
      filename,
      path: `/api/documents/file/${filename}`,
      size: file.size,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
