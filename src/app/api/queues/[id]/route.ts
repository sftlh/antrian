import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify access (allow TPT, HELPDESK, ADMIN)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || !['TPT', 'HELPDESK', 'ADMIN'].includes(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { status, notes, internalNotes, serviceCategory, priorityLevel, serviceDuration } = await request.json()
    const queueId = params.id

    // Validate status
    const validStatuses = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ESCALATED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update queue
    const updateData: any = {
      status,
      updatedAt: new Date()
    }

    if (status === 'IN_PROGRESS') {
      updateData.startedAt = new Date()
      updateData.calledBy = payload.userId // Set who is handling this queue
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    // Add new fields
    if (notes !== undefined) updateData.notes = notes
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes
    if (serviceCategory) updateData.serviceCategory = serviceCategory
    if (priorityLevel) updateData.priorityLevel = priorityLevel
    if (serviceDuration !== undefined) updateData.serviceDuration = serviceDuration

    const queue = await prisma.queue.update({
      where: { id: queueId },
      data: updateData,
      include: {
        customer: {
          select: {
            name: true,
            npwp: true
          }
        }
      }
    })

    return NextResponse.json({ queue })
  } catch (error) {
    console.error('Queue update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
