import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    // Verify receptionist access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || !['RECEPTIONIST', 'ADMIN'].includes(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all active queues for management (only WAITING and IN_PROGRESS)
    // COMPLETED queues are not shown as they cannot be managed by receptionists
    const queues = await prisma.queue.findMany({
      where: {
        status: {
          in: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            npwp: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: [
        { priorityLevel: 'desc' }, // URGENT first, then HIGH, NORMAL
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ queues })
  } catch (error) {
    console.error('Queue management fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify receptionist access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || !['RECEPTIONIST', 'ADMIN'].includes(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { queueId, action, newServiceType, newPriorityLevel } = await request.json()

    if (!queueId || !action) {
      return NextResponse.json({ error: 'Queue ID and action are required' }, { status: 400 })
    }

    const updateData: any = {}

    switch (action) {
      case 'cancel':
        updateData.status = 'CANCELLED'
        updateData.cancelledAt = new Date()
        break

      case 'reassign':
        if (!newServiceType || !['HELPDESK', 'TPT', 'BOTH'].includes(newServiceType)) {
          return NextResponse.json({ error: 'Valid service type required for reassignment' }, { status: 400 })
        }
        updateData.serviceType = newServiceType
        break

      case 'change_priority':
        if (!newPriorityLevel || !['NORMAL', 'HIGH', 'URGENT'].includes(newPriorityLevel)) {
          return NextResponse.json({ error: 'Valid priority level required' }, { status: 400 })
        }
        updateData.priorityLevel = newPriorityLevel
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    updateData.updatedAt = new Date()

    // Update the queue
    const updatedQueue = await prisma.queue.update({
      where: { id: queueId },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            npwp: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      queue: updatedQueue,
      message: `Queue ${action} successful`
    })

  } catch (error) {
    console.error('Queue management update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}