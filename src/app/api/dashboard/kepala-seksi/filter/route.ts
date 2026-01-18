import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { role: string }

    if (decoded.role !== 'KEPALA_SEKSI') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { dateFrom, dateTo } = await request.json()

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Date range is required' }, { status: 400 })
    }

    // Convert dates to UTC for database query
    const startDate = new Date(dateFrom)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(dateTo)
    endDate.setHours(23, 59, 59, 999)

    // Fetch filtered queues with rating information
    const filteredQueues = await prisma.queue.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        customer: true,
        calledByUser: true,
        escalatedToUser: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate filtered stats
    const filteredStats = {
      helpdesk: {
        waiting: filteredQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'WAITING').length,
        inProgress: filteredQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'IN_PROGRESS').length,
        completed: filteredQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'COMPLETED').length,
        escalated: filteredQueues.filter(q => q.serviceType === 'HELPDESK' && q.escalatedAt).length,
        cancelled: filteredQueues.filter(q => q.serviceType === 'HELPDESK' && q.status === 'CANCELLED').length
      },
      tpt: {
        waiting: filteredQueues.filter(q => q.serviceType === 'TPT' && q.status === 'WAITING').length,
        inProgress: filteredQueues.filter(q => q.serviceType === 'TPT' && q.status === 'IN_PROGRESS').length,
        completed: filteredQueues.filter(q => q.serviceType === 'TPT' && q.status === 'COMPLETED').length,
        escalated: filteredQueues.filter(q => q.serviceType === 'TPT' && q.escalatedAt).length,
        cancelled: filteredQueues.filter(q => q.serviceType === 'TPT' && q.status === 'CANCELLED').length
      },
      total: {
        waiting: filteredQueues.filter(q => q.status === 'WAITING').length,
        inProgress: filteredQueues.filter(q => q.status === 'IN_PROGRESS').length,
        completed: filteredQueues.filter(q => q.status === 'COMPLETED').length,
        escalated: filteredQueues.filter(q => q.escalatedAt).length,
        cancelled: filteredQueues.filter(q => q.status === 'CANCELLED').length
      },
      staffPerformance: {
        helpdesk: [] as Array<{
          id: string
          name: string
          completedToday: number
          averageRating: number
        }>,
        tpt: [] as Array<{
          id: string
          name: string
          completedToday: number
          averageRating: number
        }>
      },
      escalatedCases: filteredQueues
        .filter(q => q.escalatedAt)
        .map(q => ({
          id: q.id,
          queueNumber: q.queueNumber,
          serviceType: q.serviceType,
          customerName: q.customer?.name || '',
          customerNpwp: q.customer?.npwp || '',
          escalatedAt: q.escalatedAt!.toISOString(),
          escalatedReason: q.escalatedReason || 'Tidak ada alasan'
        }))
    }

    // Get staff performance for the filtered period
    const helpdeskStaff = await prisma.user.findMany({
      where: { role: 'HELPDESK' },
      select: { id: true, name: true }
    })

    const tptStaff = await prisma.user.findMany({
      where: { role: 'TPT' },
      select: { id: true, name: true }
    })

    // Calculate staff performance
    for (const staff of helpdeskStaff) {
      const completedQueues = filteredQueues.filter(q =>
        q.serviceType === 'HELPDESK' &&
        q.status === 'COMPLETED' &&
        q.calledBy === staff.id
      )

      const completedCount = completedQueues.length
      const ratings = completedQueues
        .map(q => q.rating)
        .filter(r => r !== null && r !== undefined) as number[]

      const averageRating = ratings.length > 0
        ? Number((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1))
        : 0

      filteredStats.staffPerformance.helpdesk.push({
        id: staff.id,
        name: staff.name,
        completedToday: completedCount,
        averageRating: averageRating
      })
    }

    for (const staff of tptStaff) {
      const completedQueues = filteredQueues.filter(q =>
        q.serviceType === 'TPT' &&
        q.status === 'COMPLETED' &&
        q.calledBy === staff.id
      )

      const completedCount = completedQueues.length
      const ratings = completedQueues
        .map(q => q.rating)
        .filter(r => r !== null && r !== undefined) as number[]

      const averageRating = ratings.length > 0
        ? Number((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1))
        : 0

      filteredStats.staffPerformance.tpt.push({
        id: staff.id,
        name: staff.name,
        completedToday: completedCount,
        averageRating: averageRating
      })
    }

    return NextResponse.json({
      stats: filteredStats,
      queues: filteredQueues.map(q => ({
        id: q.id,
        queueNumber: q.queueNumber,
        serviceType: q.serviceType,
        status: q.status,
        priorityLevel: q.priorityLevel,
        customerName: q.customer?.name || '',
        customerNpwp: q.customer?.npwp || '',
        customerPhone: q.customer?.phone || null,
        calledBy: q.calledBy,
        calledByName: q.calledByUser?.name || null,
        calledAt: q.calledAt?.toISOString() || null,
        startedAt: q.startedAt?.toISOString() || null,
        completedAt: q.completedAt?.toISOString() || null,
        cancelledAt: q.cancelledAt?.toISOString() || null,
        serviceDuration: q.serviceDuration,
        notes: q.notes,
        internalNotes: q.internalNotes,
        rating: q.rating,
        feedback: q.feedback,
        neatnessRating: q.neatnessRating,
        materialMasteryRating: q.materialMasteryRating,
        communicationRating: q.communicationRating,
        createdAt: q.createdAt.toISOString(),
        escalatedTo: q.escalatedTo,
        escalatedToName: q.escalatedToUser?.name || null,
        escalatedAt: q.escalatedAt?.toISOString() || null,
        escalatedReason: q.escalatedReason,
        serviceOrder: q.serviceOrder,
        category: q.serviceCategory, // Added category
      }))
    })

  } catch (error) {
    console.error('Error filtering data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}