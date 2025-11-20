import { NextResponse } from 'next/server'

export async function POST() {
  // For JWT authentication, logout is handled client-side by clearing the token
  // This endpoint can be used for any server-side cleanup if needed in the future
  return NextResponse.json({ message: 'Logged out successfully' })
}