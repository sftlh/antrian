import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !['PETUGAS_SPT', 'ADMIN', 'KEPALA_SEKSI'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('type') || 'BOTH'

    let queueTypes: any[] = []
    if (filterType === 'OP') queueTypes = ['SPT_TAHUNAN_OP']
    else if (filterType === 'BADAN') queueTypes = ['SPT_TAHUNAN_BADAN']
    else queueTypes = ['SPT_TAHUNAN_OP', 'SPT_TAHUNAN_BADAN']

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const queues = await prisma.queue.findMany({
      where: {
        serviceType: { in: queueTypes },
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({ queues })
  } catch (error) {
    console.error('Failed to fetch SPT queues:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
