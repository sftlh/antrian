import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get today's date range (local timezone)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

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
    const errorObj = error as any
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorObj?.message : undefined
      },
      { status: 500 }
    )
  }
}