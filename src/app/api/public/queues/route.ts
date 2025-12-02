import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Public queues API called at:', new Date().toISOString())
    console.log('📊 Environment check - DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV)

    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection successful')

    // Get current UTC date for consistent filtering across timezones
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    console.log('Date filtering (UTC):')
    console.log('- Today (UTC start):', today.toISOString())
    console.log('- Tomorrow (UTC end):', tomorrow.toISOString())

    // Get current queues (waiting, called, in progress) - filter by UTC date range
    const queues = await prisma.queue.findMany({
      where: {
        status: {
          in: ['WAITING', 'CALLED', 'IN_PROGRESS']
        },
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        queueNumber: true,
        serviceType: true,
        status: true,
        priorityLevel: true,
        customer: {
          select: {
            name: true,
            npwp: true
          }
        },
        createdAt: true,
        calledAt: true,
        startedAt: true
      },
      orderBy: [
        { priorityLevel: 'desc' }, // URGENT > HIGH > NORMAL
        { createdAt: 'asc' } // FIFO within same priority
      ]
    })

    console.log(`Found ${queues.length} active queues`)

    // Calculate statistics - get all queues for today
    const allQueuesToday = await prisma.queue.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        status: true,
        serviceType: true
      }
    })

    console.log(`Found ${allQueuesToday.length} total queues for today`)
    console.log('Status breakdown:', {
      WAITING: allQueuesToday.filter(q => q.status === 'WAITING').length,
      CALLED: allQueuesToday.filter(q => q.status === 'CALLED').length,
      IN_PROGRESS: allQueuesToday.filter(q => q.status === 'IN_PROGRESS').length,
      COMPLETED: allQueuesToday.filter(q => q.status === 'COMPLETED').length
    })

    const stats = {
      totalWaiting: allQueuesToday.filter(q => q.status === 'WAITING').length,
      totalInProgress: allQueuesToday.filter(q => q.status === 'IN_PROGRESS').length,
      totalCompleted: allQueuesToday.filter(q => q.status === 'COMPLETED').length,
      helpdeskWaiting: allQueuesToday.filter(q => q.serviceType === 'HELPDESK' && q.status === 'WAITING').length,
      tptWaiting: allQueuesToday.filter(q => q.serviceType === 'TPT' && q.status === 'WAITING').length,
      helpdeskInProgress: allQueuesToday.filter(q => q.serviceType === 'HELPDESK' && q.status === 'IN_PROGRESS').length,
      tptInProgress: allQueuesToday.filter(q => q.serviceType === 'TPT' && q.status === 'IN_PROGRESS').length
    }

    console.log('Calculated stats:', stats)

    // Transform queues for frontend
    const transformedQueues = queues.map(queue => ({
      id: queue.id,
      queueNumber: queue.queueNumber,
      serviceType: queue.serviceType,
      status: queue.status,
      priorityLevel: queue.priorityLevel,
      customerName: queue.customer.name,
      customerNpwp: queue.customer.npwp,
      createdAt: queue.createdAt.toISOString(),
      calledAt: queue.calledAt?.toISOString(),
      startedAt: queue.startedAt?.toISOString()
    }))

    return NextResponse.json({
      success: true,
      queues: transformedQueues,
      stats,
      timestamp: new Date().toISOString(),
      connectionStatus: 'connected'
    })
  } catch (error) {
    console.error('Public queues API error:', error)
    const errorObj = error as any
    console.error('Error details:', {
      message: errorObj?.message,
      code: errorObj?.code,
      meta: errorObj?.meta,
      stack: errorObj?.stack
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorObj?.message : undefined
      },
      { status: 500 }
    )
  }
}