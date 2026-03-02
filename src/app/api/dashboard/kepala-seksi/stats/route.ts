import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify Kepala Seksi access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'KEPALA_SEKSI') {
      return NextResponse.json({ error: 'Kepala Seksi access required' }, { status: 403 })
    }

    // Get today's date range in UTC for consistent filtering
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const startOfDay = new Date(today)
    const endOfDay = new Date(today)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // Get all queues for today
    const todayQueues = await prisma.queue.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    })

    // Calculate statistics
    const helpdeskStats = {
      waiting: todayQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'WAITING').length,
      inProgress: todayQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'IN_PROGRESS').length,
      completed: todayQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'COMPLETED').length,
      escalated: todayQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'ESCALATED').length,
      cancelled: todayQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'CANCELLED').length
    }

    const sptStats = {
      waiting: todayQueues.filter(q => q.serviceType.includes('SPT') && q.status === 'WAITING').length,
      inProgress: todayQueues.filter(q => q.serviceType.includes('SPT') && q.status === 'IN_PROGRESS').length,
      completed: todayQueues.filter(q => q.serviceType.includes('SPT') && q.status === 'COMPLETED').length,
      escalated: todayQueues.filter(q => q.serviceType.includes('SPT') && q.status === 'ESCALATED').length,
      cancelled: todayQueues.filter(q => q.serviceType.includes('SPT') && q.status === 'CANCELLED').length
    };
    const tptStats = {
      waiting: todayQueues.filter(q => q.serviceType === 'TPT' && q.status === 'WAITING').length,
      inProgress: todayQueues.filter(q => q.serviceType === 'TPT' && q.status === 'IN_PROGRESS').length,
      completed: todayQueues.filter(q => q.serviceType === 'TPT' && q.status === 'COMPLETED').length,
      escalated: todayQueues.filter(q => q.serviceType === 'TPT' && q.status === 'ESCALATED').length,
      cancelled: todayQueues.filter(q => q.serviceType === 'TPT' && q.status === 'CANCELLED').length
    }

    // Get staff performance
    const helpdeskUsers = await prisma.user.findMany({
      where: { role: 'HELPDESK' },
      select: { id: true, name: true }
    })

    const sptUsers = await prisma.user.findMany({ where: { role: 'PETUGAS_SPT' }, select: { id: true, name: true } });
    const tptUsers = await prisma.user.findMany({
      where: { role: 'TPT' },
      select: { id: true, name: true }
    })

    const helpdeskPerformance = await Promise.all(
      helpdeskUsers.map(async (user) => {
        const completedCount = todayQueues.filter(q =>
          q.serviceType === 'HELPDESK' &&
          q.status === 'COMPLETED' &&
          q.calledBy === user.id
        ).length

        const avgRating = await prisma.queue.aggregate({
          where: {
            serviceType: 'HELPDESK',
            status: 'COMPLETED',
            calledBy: user.id,
            completedAt: {
              gte: startOfDay,
              lt: endOfDay
            }
          },
          _avg: {
            rating: true
          }
        })

        return {
          id: user.id,
          name: user.name,
          completedToday: completedCount,
          averageRating: avgRating._avg.rating || 0
        }
      })
    )

    const sptPerformance = await Promise.all(
      sptUsers.map(async (user) => {
        const completedCount = todayQueues.filter(q =>
          q.serviceType.includes('SPT') &&
          q.status === 'COMPLETED' &&
          q.calledBy === user.id
        ).length;
        
        const avgRating = await prisma.queue.aggregate({
          where: {
            serviceType: { in: ['SPT_TAHUNAN_OP', 'SPT_TAHUNAN_BADAN'] },
            status: 'COMPLETED',
            calledBy: user.id,
            completedAt: { gte: startOfDay, lt: endOfDay }
          },
          _avg: { rating: true }
        });
        
        return {
          id: user.id,
          name: user.name,
          completedToday: completedCount,
          averageRating: avgRating._avg.rating || 0
        };
      })
    );
    
    const tptPerformance = await Promise.all(
      tptUsers.map(async (user) => {
        const completedCount = todayQueues.filter(q =>
          q.serviceType === 'TPT' &&
          q.status === 'COMPLETED' &&
          q.calledBy === user.id
        ).length

        const avgRating = await prisma.queue.aggregate({
          where: {
            serviceType: 'TPT',
            status: 'COMPLETED',
            calledBy: user.id,
            completedAt: {
              gte: startOfDay,
              lt: endOfDay
            }
          },
          _avg: {
            rating: true
          }
        })

        return {
          id: user.id,
          name: user.name,
          completedToday: completedCount,
          averageRating: avgRating._avg.rating || 0
        }
      })
    )

    // Get escalated cases
    const escalatedCases = await prisma.queue.findMany({
      where: {
        status: 'ESCALATED',
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      include: {
        customer: {
          select: {
            name: true,
            npwp: true
          }
        }
      },
      orderBy: {
        escalatedAt: 'desc'
      }
    })

    const stats = {
      helpdesk: helpdeskStats,
      tpt: tptStats,
      spt: sptStats,
      total: {
        waiting: helpdeskStats.waiting + tptStats.waiting + sptStats.waiting,
        inProgress: helpdeskStats.inProgress + tptStats.inProgress + sptStats.inProgress,
        completed: helpdeskStats.completed + tptStats.completed + sptStats.completed,
        escalated: helpdeskStats.escalated + tptStats.escalated + sptStats.escalated,
        cancelled: helpdeskStats.cancelled + tptStats.cancelled + sptStats.cancelled
      },
      staffPerformance: {
        helpdesk: helpdeskPerformance,
        tpt: tptPerformance,
        spt: sptPerformance
      },
      escalatedCases: escalatedCases.map(case_ => ({
        id: case_.id,
        queueNumber: case_.queueNumber,
        serviceType: case_.serviceType,
        customerName: case_.customer.name,
        customerNpwp: case_.customer.npwp,
        escalatedAt: case_.escalatedAt,
        escalatedReason: case_.escalatedReason
      }))
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Kepala Seksi stats fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}