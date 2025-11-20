import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify receptionist access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || !['RECEPTIONIST', 'ADMIN'].includes(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { npwp, name, interests, phone, email, serviceType, serviceOrder } = await request.json()

    // Validate required fields
    if (!npwp || !name || !serviceType) {
      return NextResponse.json({ error: 'NPWP, nama, dan jenis layanan wajib diisi' }, { status: 400 })
    }

    // Validate NPWP format (15 digits)
    const cleanNpwp = npwp.replace(/[\.\-]/g, '')
    if (!/^\d{15}$/.test(cleanNpwp)) {
      return NextResponse.json({ error: 'Format NPWP tidak valid' }, { status: 400 })
    }

    // Check if customer already exists
    let customer = await prisma.customer.findFirst({
      where: { npwp: cleanNpwp }
    })

    // Create customer if doesn't exist
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          npwp: cleanNpwp,
          name,
          interests: interests || '',
          phone: phone || null,
          email: email || null,
        }
      })
    }

    // Handle "BOTH" service type logic - create single sequential queue with K2 prefix
    if (serviceType === 'BOTH') {
      // Validate serviceOrder for BOTH
      if (!['HELPDESK_FIRST', 'TPT_FIRST'].includes(serviceOrder)) {
        return NextResponse.json({ error: 'Urutan layanan wajib dipilih untuk jenis layanan Keduanya' }, { status: 400 })
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

      // Create single queue with K2 prefix for BOTH services
      const initialServiceType = serviceOrder === 'TPT_FIRST' ? 'TPT' : 'HELPDESK'
      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Get or create counter for BOTH service type
          let counter = await tx.queueCounter.findFirst({
            where: {
              serviceType: 'BOTH',
              date: today
            }
          })

          if (!counter) {
            counter = await tx.queueCounter.create({
              data: {
                serviceType: 'BOTH',
                date: today,
                currentNumber: 1
              }
            })
          } else {
            counter = await tx.queueCounter.update({
              where: { id: counter.id },
              data: { currentNumber: counter.currentNumber + 1 }
            })
          }

          const queueNumber = `K2${dateStr}-${String(counter.currentNumber).padStart(3, '0')}`

          // Create single queue for BOTH services
          const queue = await tx.queue.create({
            data: {
              queueNumber,
              serviceType: initialServiceType, // Start with the first service
              customerId: customer.id,
              status: 'WAITING',
              serviceOrder: serviceOrder as 'HELPDESK_FIRST' | 'TPT_FIRST',
              parentQueueId: null,
              isSequenceComplete: false,
              createdAt: new Date()
            }
          })

          return { queue }
        },
        { isolationLevel: 'Serializable' }
      )

      return NextResponse.json({
        success: true,
        queueNumber: result.queue.queueNumber,
        customer: {
          id: customer.id,
          name: customer.name,
          npwp: customer.npwp
        },
        queueId: result.queue.id
      })
    }

    // Handle single service types (HELPDESK, TPT)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Create queue and generate queue number atomically using database transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Get or create counter for the service type
        let counter = await tx.queueCounter.findFirst({
          where: {
            serviceType: serviceType as 'HELPDESK' | 'TPT',
            date: today
          }
        })

        if (!counter) {
          // Calculate starting number from existing queues
          const maxQueue = await tx.queue.findFirst({
            where: {
              serviceType: serviceType as 'HELPDESK' | 'TPT',
              createdAt: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
              }
            },
            select: { queueNumber: true },
            orderBy: { queueNumber: 'desc' }
          })

          let startingNumber = 1
          if (maxQueue) {
            const numberPart = parseInt(maxQueue.queueNumber.substring(1))
            startingNumber = numberPart + 1
          }

          counter = await tx.queueCounter.create({
            data: {
              serviceType: serviceType as 'HELPDESK' | 'TPT',
              date: today,
              currentNumber: startingNumber
            }
          })
        } else {
          counter = await tx.queueCounter.update({
            where: { id: counter.id },
            data: { currentNumber: counter.currentNumber + 1 }
          })
        }

        // Generate queue number (e.g., H001, T001)
        const prefix = serviceType === 'HELPDESK' ? 'H' : 'T'
        const queueNumber = `${prefix}${counter.currentNumber.toString().padStart(3, '0')}`

        // Create queue entry within the same transaction
        const queue = await tx.queue.create({
          data: {
            queueNumber,
            serviceType: serviceType as 'HELPDESK' | 'TPT',
            status: 'WAITING',
            customerId: customer.id,
            serviceOrder: null,
            parentQueueId: null,
            isSequenceComplete: false,
            createdAt: new Date()
          }
        })

        return {
          queueNumber,
          queue
        }
      },
      { isolationLevel: 'Serializable' }
    )

    return NextResponse.json({
      success: true,
      queueNumber: result.queueNumber,
      actualServiceType: serviceType,
      customer: {
        id: customer.id,
        name: customer.name,
        npwp: customer.npwp
      },
      queueId: result.queue.id
    })

  } catch (error) {
    console.error('Customer creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ customers: [] })
    }

    // Search customers by NPWP or name
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { npwp: { contains: query.replace(/[\.\-]/g, '') } },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ customers })

  } catch (error) {
    console.error('Customer search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
