import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { parse } from 'csv-parse/sync'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

interface CsvRow {
  NPWP: string
  Name: string
  Interests?: string
}

interface UploadProgress {
  processed: number
  total: number
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('csvFile') as File

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })
    }

    // Read file content
    const csvContent = await file.text()

    // Parse CSV
    const records: CsvRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    const progress: UploadProgress = {
      processed: 0,
      total: records.length,
      errors: []
    }

    // Process each record
    for (const record of records) {
      try {
        // Validate required fields
        if (!record.NPWP || !record.Name) {
          progress.errors.push(`Row ${progress.processed + 1}: Missing NPWP or Name`)
          progress.processed++
          continue
        }

        // Validate NPWP format (15 digits)
        if (!/^\d{15}$/.test(record.NPWP)) {
          progress.errors.push(`Row ${progress.processed + 1}: Invalid NPWP format (must be 15 digits)`)
          progress.processed++
          continue
        }

        // Check for duplicate NPWP (allow duplicates only for the special no-NPWP number)
        const existingCustomer = await prisma.customer.findFirst({
          where: { npwp: record.NPWP }
        })

        if (existingCustomer && record.NPWP !== '000000000000001') {
          progress.errors.push(`Row ${progress.processed + 1}: NPWP ${record.NPWP} already exists`)
          progress.processed++
          continue
        }

        // Create customer
        await prisma.customer.create({
          data: {
            npwp: record.NPWP,
            name: record.Name,
            interests: record.Interests || null,
          }
        })

        progress.processed++
      } catch (error) {
        progress.errors.push(`Row ${progress.processed + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        progress.processed++
      }
    }

    return NextResponse.json({ progress })

  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}