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

    // Get TPT queues (serviceType: 'TPT')
    const queues = await prisma.queue.findMany({
      where: {
        serviceType: 'TPT',
        status: {
          in: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            npwp: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({ queues })
  } catch (error) {
    console.error('TPT queues fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}