import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

type QueueWithRelations = Prisma.QueueGetPayload<{
  include: {
    customer: {
      select: {
        name: true
        npwp: true
        phone: true
        contacts: {
           orderBy: { createdAt: 'desc' }
           take: 5
        }
      }
    }
    calledByUser: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

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

    // Get today's date range
    // Get today's date range in UTC for consistent filtering
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const startOfDay = new Date(today)
    const endOfDay = new Date(today)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // Get active queues (waiting and in progress only - normal management)
    const activeQueues: QueueWithRelations[] = await prisma.queue.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        },
        status: {
          in: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: {
        customer: {
          select: {
            name: true,
            npwp: true,
            phone: true,
            contacts: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
          }
        },
        calledByUser: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priorityLevel: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    // Get escalated queues from TPT that need kepala-seksi attention
    const escalatedFromTPT = await prisma.queue.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        },
        status: 'ESCALATED',
        escalatedTo: payload.userId // Escalated to this kepala-seksi user
      },
      include: {
        customer: {
          select: {
            name: true,
            npwp: true,
            phone: true,
            contacts: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
          }
        },
        calledByUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { priorityLevel: 'desc' },
        { escalatedAt: 'desc' }
      ]
    })

    // Get available staff
    const helpdeskStaff = await prisma.user.findMany({
      where: { role: 'HELPDESK' },
      select: { id: true, name: true }
    })

    const tptStaff = await prisma.user.findMany({
      where: { role: 'TPT' },
      select: { id: true, name: true }
    })

    const queues = activeQueues.map((queue: QueueWithRelations) => ({
      id: queue.id,
      queueNumber: queue.queueNumber,
      serviceType: queue.serviceType,
      status: queue.status,
      priorityLevel: queue.priorityLevel,
      customerName: queue.customer.name,
      customerNpwp: queue.customer.npwp,
      customerPhone: queue.customer.phone,
      customerContacts: queue.customer.contacts,
      calledBy: queue.calledByUser?.name || null,
      calledById: queue.calledBy,
      calledAt: queue.calledAt,
      startedAt: queue.startedAt,
      notes: queue.notes,
      createdAt: queue.createdAt
    }))

    const escalatedQueues = escalatedFromTPT.map(queue => ({
      id: queue.id,
      queueNumber: queue.queueNumber,
      serviceType: queue.serviceType,
      status: queue.status,
      priorityLevel: queue.priorityLevel,
      customerName: queue.customer.name,
      customerNpwp: queue.customer.npwp,
      customerPhone: queue.customer.phone,
      customerContacts: queue.customer.contacts,
      calledBy: queue.calledByUser?.name || null,
      calledById: queue.calledBy,
      calledAt: queue.calledAt,
      startedAt: queue.startedAt,
      notes: queue.notes,
      escalatedAt: queue.escalatedAt,
      escalatedReason: queue.escalatedReason,
      createdAt: queue.createdAt
    }))

    return NextResponse.json({
      queues,
      escalatedQueues,
      staff: {
        helpdesk: helpdeskStaff,
        tpt: tptStaff
      }
    })
  } catch (error) {
    console.error('Queue management fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Reassign queue to different staff
export async function PATCH(request: NextRequest) {
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

    const { queueId, action, staffId, priorityLevel, notes } = await request.json()

    if (!queueId || !action) {
      return NextResponse.json({ error: 'Queue ID and action are required' }, { status: 400 })
    }

    const updateData: any = {}

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

      case 'call':
        updateData.status = 'CALLED'
        updateData.calledAt = new Date()
        break

      case 'start':
        updateData.status = 'IN_PROGRESS'
        updateData.startedAt = new Date()
        break

      case 'escalate':
        // When escalating, automatically reassign to Helpdesk staff
        const helpdeskStaff = await prisma.user.findMany({
          where: { role: 'HELPDESK' },
          select: { id: true }
        })

        if (helpdeskStaff.length === 0) {
          return NextResponse.json({ error: 'No Helpdesk staff available for escalation' }, { status: 400 })
        }

        // Assign to first available Helpdesk staff (can be improved with load balancing)
        const assignedHelpdeskStaff = helpdeskStaff[0]

        updateData.status = 'ESCALATED'
        updateData.escalatedAt = new Date()
        updateData.escalatedReason = notes || 'Escalated by Kepala Seksi'
        updateData.escalatedTo = assignedHelpdeskStaff.id
        // Clear current assignment since it's being escalated
        updateData.calledBy = null
        updateData.calledAt = null
        updateData.startedAt = null
        break

      case 'cancel':
        updateData.status = 'CANCELLED'
        break

      case 'priority':
        if (!priorityLevel) {
          return NextResponse.json({ error: 'Priority level is required' }, { status: 400 })
        }
        updateData.priorityLevel = priorityLevel
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (notes && action !== 'escalate') {
      updateData.notes = notes
    }

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

    return NextResponse.json({
      success: true,
      queue: {
        id: updatedQueue.id,
        queueNumber: updatedQueue.queueNumber,
        status: updatedQueue.status,
        calledBy: updatedQueue.calledByUser?.name || null,
        calledAt: updatedQueue.calledAt,
        startedAt: updatedQueue.startedAt
      }
    })
  } catch (error) {
    console.error('Queue management update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}