import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Allow unauthenticated feedback submission for customers
    const { rating, neatnessRating, materialMasteryRating, communicationRating, comment } = await request.json()
    const queueId = params.id

    // Validate ratings
    const validateRating = (r: number) => r && (r < 1 || r > 5)
    if (validateRating(rating) || validateRating(neatnessRating) || validateRating(materialMasteryRating) || validateRating(communicationRating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    // Update queue with feedback
    const updateData: any = {}

    if (rating) updateData.rating = rating
    if (neatnessRating) updateData.neatnessRating = neatnessRating
    if (materialMasteryRating) updateData.materialMasteryRating = materialMasteryRating
    if (communicationRating) updateData.communicationRating = communicationRating
    if (comment) updateData.feedback = comment

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
    console.error('Feedback submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}