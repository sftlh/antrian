import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
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

    const { queueId, reason } = await request.json()

    if (!queueId || !reason) {
      return NextResponse.json({ error: 'Queue ID and reason are required' }, { status: 400 })
    }

    // Get helpdesk users
    const helpdeskUsers = await prisma.user.findMany({
      where: { role: 'HELPDESK' },
      select: { id: true }
    })

    if (helpdeskUsers.length === 0) {
      return NextResponse.json({ error: 'No Helpdesk staff available for escalation' }, { status: 400 })
    }

    // Assign to first available helpdesk (can be improved with load balancing)
    const assignedHelpdesk = helpdeskUsers[0]

    // Update queue to escalate to helpdesk
    const updatedQueue = await prisma.queue.update({
      where: { id: queueId },
      data: {
        status: 'ESCALATED',
        escalatedAt: new Date(),
        escalatedReason: reason,
        escalatedTo: assignedHelpdesk.id,
        // Add escalation source flag
        notes: `ESCALATION FROM KEPALA_SEKSI: ${reason}`,
        // Clear current assignment since it's being escalated
        calledBy: null,
        calledAt: null,
        startedAt: null
      },
      include: {
        customer: {
          select: {
            name: true,
            npwp: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Queue escalated to Helpdesk',
      queue: {
        id: updatedQueue.id,
        queueNumber: updatedQueue.queueNumber,
        status: updatedQueue.status,
        escalatedTo: updatedQueue.escalatedTo,
        escalatedReason: updatedQueue.escalatedReason
      }
    })
  } catch (error) {
    console.error('Kepala Seksi escalation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}