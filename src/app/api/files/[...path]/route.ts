
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePathComponents = params.path
    if (!filePathComponents || filePathComponents.length === 0) {
      return NextResponse.json({ error: 'File path not provided' }, { status: 400 })
    }

    // Security: Prevent directory traversal
    const safePath = path.normalize(filePathComponents.join('/')).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.join(process.cwd(), 'public', 'uploads', safePath)

    // Ensure the path is still within public/uploads
    if (!fullPath.startsWith(path.join(process.cwd(), 'public', 'uploads'))) {
       return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    if (!existsSync(fullPath)) {
      console.error(`[FileServe] File not found: ${fullPath}`)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    console.log(`[FileServe] Serving file: ${fullPath}`)
    const fileBuffer = await readFile(fullPath)
    
    // Determine content type
    const ext = path.extname(fullPath).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.pdf':
        contentType = 'application/pdf'
        break
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, mutable',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
