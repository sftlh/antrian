import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get('serviceType') // 'HELPDESK' or 'TPT'
    const period = searchParams.get('period') || 'today' // 'today', 'month', 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build date filter based on period
    let dateFilter = {}
    const now = new Date()

    if (period === 'today') {
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const tomorrow = new Date(today)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      dateFilter = {
        completedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    } else if (period === 'month') {
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      dateFilter = {
        completedAt: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      }
    }

    // Build service type filter
    let serviceTypeFilter = {}
    if (serviceType && serviceType !== 'ALL') {
      serviceTypeFilter = { serviceType }
    }

    // Get completed queues with feedback and assessments
    const completedQueues = await prisma.queue.findMany({
      where: {
        status: 'COMPLETED',
        ...dateFilter,
        ...serviceTypeFilter,
        // Ensure we have feedback or ratings
        OR: [
          { rating: { not: null } },
          { feedback: { not: null } },
          { neatnessRating: { not: null } },
          { materialMasteryRating: { not: null } },
          { communicationRating: { not: null } }
        ]
      },
      select: {
        id: true,
        queueNumber: true,
        serviceType: true,
        serviceCategory: true,
        priorityLevel: true,
        customer: {
          select: {
            id: true,
            name: true,
            npwp: true
          }
        },
        completedAt: true,
        serviceDuration: true,
        rating: true,
        feedback: true,
        neatnessRating: true,
        materialMasteryRating: true,
        communicationRating: true,
        notes: true,
        internalNotes: true,
        calledByUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await prisma.queue.count({
      where: {
        status: 'COMPLETED',
        ...dateFilter,
        ...serviceTypeFilter,
        OR: [
          { rating: { not: null } },
          { feedback: { not: null } },
          { neatnessRating: { not: null } },
          { materialMasteryRating: { not: null } },
          { communicationRating: { not: null } }
        ]
      }
    })

    // Calculate average ratings
    const ratings = completedQueues.filter(q => q.rating !== null).map(q => q.rating!)
    const neatnessRatings = completedQueues.filter(q => q.neatnessRating !== null).map(q => q.neatnessRating!)
    const materialMasteryRatings = completedQueues.filter(q => q.materialMasteryRating !== null).map(q => q.materialMasteryRating!)
    const communicationRatings = completedQueues.filter(q => q.communicationRating !== null).map(q => q.communicationRating!)

    const stats = {
      totalFeedback: completedQueues.length,
      averageRating: ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null,
      averageNeatness: neatnessRatings.length > 0 ? (neatnessRatings.reduce((a, b) => a + b, 0) / neatnessRatings.length).toFixed(1) : null,
      averageMaterialMastery: materialMasteryRatings.length > 0 ? (materialMasteryRatings.reduce((a, b) => a + b, 0) / materialMasteryRatings.length).toFixed(1) : null,
      averageCommunication: communicationRatings.length > 0 ? (communicationRatings.reduce((a, b) => a + b, 0) / communicationRatings.length).toFixed(1) : null,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount
    }

    return NextResponse.json({
      success: true,
      serviceHistory: completedQueues,
      stats
    })

  } catch (error) {
    console.error('Service history API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}