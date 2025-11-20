import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
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

    const { queueId, reason } = await request.json()

    if (!queueId || !reason) {
      return NextResponse.json({ error: 'Queue ID and reason are required' }, { status: 400 })
    }

    // Get kepala-seksi users
    const kepalaSeksiUsers = await prisma.user.findMany({
      where: { role: 'KEPALA_SEKSI' },
      select: { id: true }
    })

    if (kepalaSeksiUsers.length === 0) {
      return NextResponse.json({ error: 'No Kepala Seksi available for escalation' }, { status: 400 })
    }

    // Assign to first available kepala-seksi (can be improved with load balancing)
    const assignedKepalaSeksi = kepalaSeksiUsers[0]

    // Update queue to escalate to kepala-seksi
    const updatedQueue = await prisma.queue.update({
      where: { id: queueId },
      data: {
        status: 'ESCALATED',
        escalatedAt: new Date(),
        escalatedReason: reason,
        escalatedTo: assignedKepalaSeksi.id,
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
      message: 'Queue escalated to Kepala Seksi',
      queue: {
        id: updatedQueue.id,
        queueNumber: updatedQueue.queueNumber,
        status: updatedQueue.status,
        escalatedTo: updatedQueue.escalatedTo,
        escalatedReason: updatedQueue.escalatedReason
      }
    })
  } catch (error) {
    console.error('TPT escalation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}