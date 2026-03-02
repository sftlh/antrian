import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const { username, password, selectedRole } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = comparePassword(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get all combined roles
    const availableRoles = Array.from(new Set([user.role, ...(user.additionalRoles || [])]))

    // Check if user has multiple roles and hasn't selected one
    if (!selectedRole && availableRoles.length > 1) {
      return NextResponse.json({
        requiresRoleSelection: true,
        availableRoles,
        message: 'Please select a role to continue'
      })
    }

    // Determine the actual role for this session
    let sessionRole = user.role
    if (selectedRole) {
      if (!availableRoles.includes(selectedRole)) {
        return NextResponse.json(
          { error: 'Invalid role selection' },
          { status: 400 }
        )
      }
      sessionRole = selectedRole as any
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email || undefined,
      name: user.name,
      role: sessionRole
    })

    // Return user data and token
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: sessionRole
    }

    return NextResponse.json({
      user: userData,
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}