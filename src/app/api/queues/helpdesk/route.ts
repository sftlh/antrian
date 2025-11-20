import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify Helpdesk access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'HELPDESK') {
      return NextResponse.json({ error: 'Helpdesk access required' }, { status: 403 })
    }

    // Get Helpdesk queues (serviceType: 'HELPDESK', or escalated to this helpdesk user)
    const queues = await prisma.queue.findMany({
      where: {
        OR: [
          {
            AND: [
              { serviceType: 'HELPDESK' },
              {
                status: {
                  in: ['WAITING', 'IN_PROGRESS']
                }
              }
            ]
          },
          // Include escalated queues assigned to this helpdesk user
          {
            AND: [
              { status: 'ESCALATED' },
              { escalatedTo: payload.userId }
            ]
          }
        ]
      },
      include: {
        customer: {
          select: {
            name: true,
            npwp: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Show escalated queues first
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ queues })
  } catch (error) {
    console.error('Helpdesk queues fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}