import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

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

    // Get today's date range in UTC for consistent filtering
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    // Get today's queue statistics
    const todayQueues = await prisma.queue.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Calculate statistics by service type
    const helpdeskQueues = todayQueues.filter(q => q.serviceType === 'HELPDESK')
    const tptQueues = todayQueues.filter(q => q.serviceType === 'TPT')
    const sptQueues = todayQueues.filter(q => q.serviceType.startsWith('SPT'))

    const stats = {
      totalToday: todayQueues.length,
      avgWaitTime: 15, // Placeholder - would need to calculate actual wait times
      helpdesk: {
        waiting: helpdeskQueues.filter(q => q.status === 'WAITING').length,
        inProgress: helpdeskQueues.filter(q => q.status === 'IN_PROGRESS').length,
        completed: helpdeskQueues.filter(q => q.status === 'COMPLETED').length
      },
      tpt: {
        waiting: tptQueues.filter(q => q.status === 'WAITING').length,
        inProgress: tptQueues.filter(q => q.status === 'IN_PROGRESS').length,
        completed: tptQueues.filter(q => q.status === 'COMPLETED').length
      },
      spt: {
        waiting: sptQueues.filter(q => q.status === 'WAITING').length,
        inProgress: sptQueues.filter(q => q.status === 'IN_PROGRESS').length,
        completed: sptQueues.filter(q => q.status === 'COMPLETED').length
      }
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Receptionist stats fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}