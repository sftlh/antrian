import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // For now, just validate the request body and return success
    // In a real application, you would save these settings to a database
    const settings = await request.json()

    // Basic validation
    if (!settings.businessHoursStart || !settings.businessHoursEnd) {
      return NextResponse.json({ error: 'Business hours are required' }, { status: 400 })
    }

    if (settings.maxQueuesPerStaff < 1 || settings.maxQueuesPerStaff > 100) {
      return NextResponse.json({ error: 'Max queues per staff must be between 1 and 100' }, { status: 400 })
    }

    if (settings.escalationTimeout < 5 || settings.escalationTimeout > 480) {
      return NextResponse.json({ error: 'Escalation timeout must be between 5 and 480 minutes' }, { status: 400 })
    }

    // TODO: Save settings to database
    // For now, just return success
    console.log('Settings saved:', settings)

    return NextResponse.json({ message: 'Settings saved successfully' })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // TODO: Load settings from database
    // For now, return default settings
    const defaultSettings = {
      businessHoursStart: '08:00',
      businessHoursEnd: '17:00',
      maxQueuesPerStaff: 10,
      autoAssignQueues: true,
      escalationTimeout: 30
    }

    return NextResponse.json({ settings: defaultSettings })
  } catch (error) {
    console.error('Settings load error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}