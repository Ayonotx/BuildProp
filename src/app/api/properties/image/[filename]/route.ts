export const dynamic = 'force-dynamic'

import { readFile } from 'fs/promises'
import path from 'path'
import type { NextRequest } from 'next/server'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    const filePath = path.join(process.cwd(), 'data', 'uploads', 'properties', filename)
    const buffer = await readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}
