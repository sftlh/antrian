import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🏥 Health check called at:', new Date().toISOString())

    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection successful')

    // Get basic stats
    const totalQueues = await prisma.queue.count()
    const activeQueues = await prisma.queue.count({
      where: {
        status: {
          in: ['WAITING', 'CALLED', 'IN_PROGRESS']
        }
      }
    })

    console.log(`📊 Database stats - Total: ${totalQueues}, Active: ${activeQueues}`)

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      totalQueues,
      activeQueues,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    })
  } catch (error) {
    console.error('❌ Health check failed:', error)
    const errorObj = error as any
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: errorObj?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      },
      { status: 500 }
    )
  }
}