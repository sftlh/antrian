import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

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

    // Get all queues with full details
    const queues = await prisma.queue.findMany({
      include: {
        customer: {
          select: {
            name: true,
            npwp: true,
            phone: true
          }
        },
        calledByUser: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        escalatedToUser: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: [
        { priorityLevel: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    // Get all staff members for reassignment
    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ['HELPDESK', 'TPT', 'KEPALA_SEKSI']
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        role: true
      }
    })

    return NextResponse.json({ queues, staff })
  } catch (error) {
    console.error('Admin queues fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const { action, queueIds, staffId, priorityLevel, status } = await request.json()

    if (!action || !queueIds || queueIds.length === 0) {
      return NextResponse.json({ error: 'Action and queue IDs are required' }, { status: 400 })
    }

    const updateData: any = {}
    const results = []

    switch (action) {
      case 'reassign':
        if (!staffId) {
          return NextResponse.json({ error: 'Staff ID is required for reassignment' }, { status: 400 })
        }
        updateData.calledBy = staffId
        updateData.calledAt = new Date()
        updateData.status = 'IN_PROGRESS'
        updateData.startedAt = new Date()
        break

      case 'priority':
        if (!priorityLevel) {
          return NextResponse.json({ error: 'Priority level is required' }, { status: 400 })
        }
        updateData.priorityLevel = priorityLevel
        break

      case 'status':
        if (!status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 })
        }
        updateData.status = status
        if (status === 'CANCELLED') {
          updateData.cancelledAt = new Date()
        } else if (status === 'COMPLETED') {
          updateData.completedAt = new Date()
        }
        break

      case 'cancel':
        updateData.status = 'CANCELLED'
        updateData.cancelledAt = new Date()
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update all specified queues
    for (const queueId of queueIds) {
      try {
        const updatedQueue = await prisma.queue.update({
          where: { id: queueId },
          data: updateData,
          include: {
            customer: {
              select: {
                name: true,
                npwp: true
              }
            },
            calledByUser: {
              select: {
                name: true
              }
            }
          }
        })
        results.push({
          success: true,
          queueId,
          queue: updatedQueue
        })
      } catch (error) {
        results.push({
          success: false,
          queueId,
          error: 'Failed to update queue'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.filter(r => r.success).length} of ${queueIds.length} queues`,
      results
    })
  } catch (error) {
    console.error('Admin queue update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}