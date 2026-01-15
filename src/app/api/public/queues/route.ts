export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Public queues API called at:', new Date().toISOString())

    // Get today's date range in UTC for consistent filtering across environments
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    console.log('Date range (UTC):', { today: today.toISOString(), tomorrow: tomorrow.toISOString() })
    console.log('Server timezone offset:', now.getTimezoneOffset(), 'minutes')

    // Get current queues (waiting, called, in progress)
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
        { priorityLevel: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    console.log(`Found ${queues.length} active queues`)

    // Calculate statistics
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

    console.log('✅ API call completed successfully')

    // Return response with no-cache headers to ensure real-time updates
    return NextResponse.json({
      success: true,
      queues: transformedQueues,
      stats,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('❌ Public queues API error:', error)
    const errorObj = error as any
    console.error('Error details:', {
      message: errorObj?.message,
      code: errorObj?.code,
      meta: errorObj?.meta
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