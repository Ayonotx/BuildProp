export const dynamic = 'force-dynamic'

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { files } = await request.json()

    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ error: 'No files uploaded. Send JSON with { files: [{ name, data, type }] }' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'properties')
    await mkdir(uploadDir, { recursive: true })

    const uploadedFiles: { filename: string; url: string; size: number }[] = []

    for (const file of files) {
      const { name, data, type } = file
      if (!name || !data) continue

      const safeName = name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + safeName

      // data is base64 encoded
      const base64Data = data.includes(',') ? data.split(',')[1] : data
      const buffer = Buffer.from(base64Data, 'base64')

      await writeFile(path.join(uploadDir, filename), buffer)
      uploadedFiles.push({
        filename,
        url: '/api/properties/image/' + filename,
        size: buffer.length,
      })
    }

    return Response.json({ files: uploadedFiles })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[upload] Error:', message, error instanceof Error ? error.stack : '')
    return Response.json({ error: 'Upload failed: ' + message }, { status: 500 })
  }
}