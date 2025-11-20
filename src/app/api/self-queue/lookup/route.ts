import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const npwp = searchParams.get('npwp')

    if (!npwp) {
      return NextResponse.json(
        { error: 'NPWP is required' },
        { status: 400 }
      )
    }

    // Find the most recent customer with this NPWP
    const customer = await prisma.customer.findFirst({
      where: { npwp },
      orderBy: { createdAt: 'desc' }
    })

    if (!customer) {
      return NextResponse.json(
        { found: false },
        { status: 200 }
      )
    }

    return NextResponse.json({
      found: true,
      customer: {
        name: customer.name,
        interests: customer.interests,
        phone: customer.phone,
        email: customer.email
      }
    })
  } catch (error) {
    console.error('NPWP lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup NPWP' },
      { status: 500 }
    )
  }
}
