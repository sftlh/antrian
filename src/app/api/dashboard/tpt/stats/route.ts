import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify TPT access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'TPT') {
      return NextResponse.json({ error: 'TPT access required' }, { status: 403 })
    }

    // Get today's date range - use a simpler approach
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const day = today.getDate()
    const startOfDay = new Date(year, month, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999)

    // Get completed services for today by this technician
    const completedServices = await prisma.queue.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: startOfDay,
          lt: endOfDay
        },
        calledBy: payload.userId
      }
    })

    // Calculate statistics
    const servicesCompleted = completedServices.length
    const totalDuration = completedServices.reduce((sum, service) => sum + (service.serviceDuration || 0), 0)
    const averageDuration = servicesCompleted > 0 ? totalDuration / servicesCompleted : 0

    const ratedServices = completedServices.filter(service => service.rating)
    const averageRating = ratedServices.length > 0
      ? ratedServices.reduce((sum, service) => sum + (service.rating || 0), 0) / ratedServices.length
      : 0

    const stats = {
      servicesCompleted,
      averageRating,
      totalDuration,
      averageDuration
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('TPT stats fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}