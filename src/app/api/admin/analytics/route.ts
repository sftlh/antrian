import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get total queues for percentage calculations
    const totalQueues = await prisma.queue.count()

    // Service distribution
    const helpdeskCount = await prisma.queue.count({
      where: { serviceType: 'HELPDESK' }
    })
    const tptCount = await prisma.queue.count({
      where: { serviceType: 'TPT' }
    })
    const bothCount = await prisma.queue.count({
      where: { serviceType: 'BOTH' }
    })

    // Priority distribution
    const normalCount = await prisma.queue.count({
      where: { priorityLevel: 'NORMAL' }
    })
    const highCount = await prisma.queue.count({
      where: { priorityLevel: 'HIGH' }
    })
    const urgentCount = await prisma.queue.count({
      where: { priorityLevel: 'URGENT' }
    })

    // Calculate percentages
    const serviceDistribution = {
      HELPDESK: totalQueues > 0 ? Math.round((helpdeskCount / totalQueues) * 100) : 0,
      TPT: totalQueues > 0 ? Math.round((tptCount / totalQueues) * 100) : 0,
      BOTH: totalQueues > 0 ? Math.round((bothCount / totalQueues) * 100) : 0,
    }

    const priorityDistribution = {
      NORMAL: totalQueues > 0 ? Math.round((normalCount / totalQueues) * 100) : 0,
      HIGH: totalQueues > 0 ? Math.round((highCount / totalQueues) * 100) : 0,
      URGENT: totalQueues > 0 ? Math.round((urgentCount / totalQueues) * 100) : 0,
    }

    // Calculate average wait time (for completed queues)
    const completedQueues = await prisma.queue.findMany({
      where: {
        status: 'COMPLETED',
        calledAt: { not: null },
        startedAt: { not: null }
      },
      select: {
        calledAt: true,
        startedAt: true
      }
    })

    let averageWaitTime = 0
    if (completedQueues.length > 0) {
      const totalWaitTime = completedQueues.reduce((sum, queue) => {
        const waitTime = new Date(queue.startedAt!).getTime() - new Date(queue.calledAt!).getTime()
        return sum + (waitTime / (1000 * 60)) // Convert to minutes
      }, 0)
      averageWaitTime = Math.round(totalWaitTime / completedQueues.length)
    }

    const analytics = {
      serviceDistribution,
      priorityDistribution,
      averageWaitTime
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}