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

    // Get queue statistics
    const totalQueues = await prisma.queue.count()
    const waitingQueues = await prisma.queue.count({
      where: { status: 'WAITING' }
    })
    const inProgressQueues = await prisma.queue.count({
      where: { status: 'IN_PROGRESS' }
    })
    const completedQueues = await prisma.queue.count({
      where: { status: 'COMPLETED' }
    })
    const escalatedQueues = await prisma.queue.count({
      where: { status: 'ESCALATED' }
    })
    const cancelledQueues = await prisma.queue.count({
      where: { status: 'CANCELLED' }
    })

    const stats = {
      total: totalQueues,
      waiting: waitingQueues,
      inProgress: inProgressQueues,
      completed: completedQueues,
      escalated: escalatedQueues,
      cancelled: cancelledQueues,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Admin stats fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}