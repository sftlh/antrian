import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const NO_NPWP_NUMBER = '000000000000001'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { npwp, name, interests, phone, email, serviceType, hasNpwp, serviceOrder } = body

    // Validation
    if (!name || !serviceType) {
      return NextResponse.json(
        { error: 'Name and service type are required' },
        { status: 400 }
      )
    }

    if (!['HELPDESK', 'TPT', 'BOTH', 'SPT_TAHUNAN_OP', 'SPT_TAHUNAN_BADAN'].includes(serviceType)) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      )
    }

    if (serviceType === 'BOTH' && !['TPT_FIRST', 'HELPDESK_FIRST'].includes(serviceOrder)) {
      return NextResponse.json(
        { error: 'Invalid service order for BOTH' },
        { status: 400 }
      )
    }

    // Determine NPWP to use
    const finalNpwp = hasNpwp === false ? NO_NPWP_NUMBER : npwp

    if (hasNpwp === true && !finalNpwp) {
      return NextResponse.json(
        { error: 'NPWP is required when hasNpwp is true' },
        { status: 400 }
      )
    }

    // Start a transaction to create customer and queue
    const result = await prisma.$transaction(async (tx) => {
      let customer

      // Handle customer creation/reuse based on NPWP
      if (finalNpwp === NO_NPWP_NUMBER) {
        // Always create new customer for no-NPWP case
        customer = await tx.customer.create({
          data: {
            npwp: finalNpwp,
            name,
            interests: interests || '',
            phone: phone || '',
            email: email || ''
          }
        })
      } else {
        // For real NPWPs, check if exists
        const existingCustomer = await tx.customer.findFirst({
          where: { npwp: finalNpwp }
        })

        if (existingCustomer) {
          // Reuse existing customer
          customer = existingCustomer
        } else {
          // Create new customer
          customer = await tx.customer.create({
            data: {
              npwp: finalNpwp,
              name,
              interests: interests || '',
              phone: phone || '',
              email: email || ''
            }
          })
        }
      }

      // Get today's date for queue number generation
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')

      // Count queues created today (UTC-based)
      const now = new Date()
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const todayEnd = new Date(todayStart)
      todayEnd.setUTCHours(23, 59, 59, 999)

      const queueCount = await tx.queue.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      })

      // Handle queue creation based on service type
      const queues = []

      if (serviceType === 'BOTH') {
        // Create single queue with K2 prefix for BOTH services
        const initialServiceType = serviceOrder === 'TPT_FIRST' ? 'TPT' : 'HELPDESK'
        
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

        // Create single queue for BOTH services, starting with the first service
        const queue = await tx.queue.create({
          data: {
            queueNumber,
            serviceType: initialServiceType, // Start with the first service type
            customerId: customer.id,
            status: 'WAITING',
            priorityLevel: 'NORMAL',
            serviceOrder,
            parentQueueId: null,
            isSequenceComplete: false,
            createdAt: new Date()
          }
        })

        queues.push(queue)
      } else {
        // Generate queue number based on service type
        let queuePrefix = ''
        switch (serviceType) {
          case 'HELPDESK':
            queuePrefix = 'H'
            break
          case 'TPT':
            queuePrefix = 'T'
            break
        }

        const queueNumber = `${queuePrefix}${dateStr}-${String(queueCount + 1).padStart(3, '0')}`

        // Create single queue
        const queue = await tx.queue.create({
          data: {
            queueNumber,
            serviceType,
            customerId: customer.id,
            status: 'WAITING',
            priorityLevel: 'NORMAL'
          }
        })
        queues.push(queue)
      }

      return { customer, queues }
    })

    return NextResponse.json({
      success: true,
      serviceType,
      queues: result.queues.map(q => ({ queueNumber: q.queueNumber, serviceType: q.serviceType, serviceOrder: q.serviceOrder })),
      customer: {
        name: result.customer.name,
        npwp: result.customer.npwp
      },
      message: 'Queue registered successfully'
    })
  } catch (error) {
    console.error('Self-queue registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register queue' },
      { status: 500 }
    )
  }
}
