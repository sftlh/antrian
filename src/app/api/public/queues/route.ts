import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get today's date for filtering in JavaScript (handles timezone issues)
    const todayString = new Date().toDateString()

    // Get current queues (waiting, called, in progress) - get recent queues and filter in JS
    const recentQueues = await prisma.queue.findMany({
      where: {
        status: {
          in: ['WAITING', 'CALLED', 'IN_PROGRESS']
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
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

    // Filter queues created today
    const queues = recentQueues.filter(queue => {
      return new Date(queue.createdAt).toDateString() === todayString
    })

    // Calculate statistics - get recent queues and filter in JS
    const allRecentQueues = await prisma.queue.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        status: true,
        serviceType: true,
        createdAt: true
      }
    })

    // Filter queues created today
    const allQueuesToday = allRecentQueues.filter(queue => {
      return new Date(queue.createdAt).toDateString() === todayString
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
      stats
    })
  } catch (error) {
    console.error('Public queues API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}