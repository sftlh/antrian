import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const customerId = params.customerId

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get recent service history (last 5 visits)
    const serviceHistory = await prisma.queue.findMany({
      where: {
        customerId: customerId,
        status: 'COMPLETED'
      },
      include: {
        customer: {
          select: {
            name: true,
            npwp: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 5
    })

    // Get current active queues
    const activeQueues = await prisma.queue.findMany({
      where: {
        customerId: customerId,
        status: {
          in: ['WAITING', 'IN_PROGRESS']
        }
      }
    })

    return NextResponse.json({
      customer,
      serviceHistory,
      activeQueues,
      totalVisits: serviceHistory.length
    })
  } catch (error) {
    console.error('Customer details fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}