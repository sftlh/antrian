import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

type QueueStats = {
  rating: number | null
  serviceDuration: number | null
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get today's date range - use a simpler approach
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const day = today.getDate()
    const startOfDay = new Date(year, month, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999)

    // Get completed queues for today by the current user
    const completedQueues: QueueStats[] = await prisma.queue.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: startOfDay,
          lt: endOfDay
        },
        serviceType: 'HELPDESK'
      },
      select: {
        rating: true,
        serviceDuration: true
      }
    })

    // Calculate statistics
    const servicesCompleted = completedQueues.length
    const totalRating = completedQueues.reduce((sum: number, queue: QueueStats) => sum + (queue.rating || 0), 0)
    const averageRating = servicesCompleted > 0 ? totalRating / servicesCompleted : 0

    const totalDuration = completedQueues.reduce((sum: number, queue: QueueStats) => sum + (queue.serviceDuration || 0), 0)
    const averageDuration = servicesCompleted > 0 ? totalDuration / servicesCompleted : 0

    return NextResponse.json({
      stats: {
        servicesCompleted,
        averageRating,
        totalDuration,
        averageDuration
      }
    })
  } catch (error) {
    console.error('Helpdesk stats fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}