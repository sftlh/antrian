import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

// Helper function to create the next queue in a sequence
async function createNextQueueInSequence(completedQueue: any, nextServiceType: 'HELPDESK' | 'TPT') {
  try {
    // First, check if there's already an existing queue for this customer and service type
    // This handles the case where self-queue created both queues upfront
    const existingNextQueue = await prisma.queue.findFirst({
      where: {
        customerId: completedQueue.customerId,
        serviceType: nextServiceType,
        status: 'WAITING',
        parentQueueId: completedQueue.parentQueueId || completedQueue.id
      }
    });

    if (existingNextQueue) {
      // If the next queue already exists, just update its status to make it active
      await prisma.queue.update({
        where: { id: existingNextQueue.id },
        data: {
          status: 'WAITING', // Ensure it's still waiting
          updatedAt: new Date()
        }
      });
      console.log(`Activated existing next queue ${existingNextQueue.queueNumber} for customer ${completedQueue.customerId}`);
      return;
    }

    // If no existing queue, create a new one
    // Extract the base number from the completed queue number
    // Handle formats like "T20251118-003" or "H001"
    const originalQueueNumber = completedQueue.queueNumber;

    let queueNumber: string;

    if (originalQueueNumber.includes('-')) {
      // Format: T20251118-003 or H20251118-003, preserve the date format
      const parts = originalQueueNumber.split('-');
      const datePart = parts[0].substring(1); // Remove prefix (T or H)
      const numberPart = parseInt(parts[1]);
      const nextNumber = numberPart + 1; // Increment for the next service

      const prefix = nextServiceType === 'HELPDESK' ? 'H' : 'T';
      queueNumber = `${prefix}${datePart}-${nextNumber.toString().padStart(3, '0')}`;
    } else {
      // Format: H001, T001, etc. - extract the number part
      const baseNumber = parseInt(originalQueueNumber.substring(1));
      const prefix = nextServiceType === 'HELPDESK' ? 'H' : 'T';
      queueNumber = `${prefix}${baseNumber.toString().padStart(3, '0')}`;
    }

    // Check if this queue number already exists for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingQueue = await prisma.queue.findFirst({
      where: {
        queueNumber,
        createdAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    if (existingQueue) {
      // If the queue number already exists, increment and try again
      if (queueNumber.includes('-')) {
        // Handle date format: T20251118-004 -> T20251118-005
        const parts = queueNumber.split('-');
        const prefix = parts[0];
        const numberPart = parts[1];
        let nextNumber = parseInt(numberPart) + 1;
        queueNumber = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
      } else {
        // Handle simple format: T004 -> T005
        const prefix = queueNumber.substring(0, 1);
        let nextNumber = parseInt(queueNumber.substring(1)) + 1;
        queueNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      }
    }

    // Update the counter to ensure it's at least as high as this number
    let numberPart: number;
    if (queueNumber.includes('-')) {
      // Date format: T20251118-004, extract the number after the last dash
      const parts = queueNumber.split('-');
      numberPart = parseInt(parts[parts.length - 1]);
    } else {
      // Simple format: T004, extract the number part
      numberPart = parseInt(queueNumber.substring(1));
    }

    // Get current counter value
    const currentCounter = await prisma.queueCounter.findFirst({
      where: {
        serviceType: nextServiceType,
        date: today
      },
      select: { currentNumber: true }
    });

    const currentNumber = currentCounter?.currentNumber || 0;
    const newCounterValue = Math.max(numberPart + 1, currentNumber);

    // Update or create the counter
    await prisma.queueCounter.upsert({
      where: {
        serviceType_date: {
          serviceType: nextServiceType,
          date: today
        }
      },
      update: {
        currentNumber: newCounterValue
      },
      create: {
        serviceType: nextServiceType,
        date: today,
        currentNumber: numberPart + 1
      }
    })

    // Create the next queue in the sequence
    await prisma.queue.create({
      data: {
        queueNumber,
        serviceType: nextServiceType,
        status: 'WAITING',
        customerId: completedQueue.customerId,
        serviceOrder: completedQueue.serviceOrder,
        parentQueueId: completedQueue.parentQueueId || completedQueue.id, // Link to the original first queue
        isSequenceComplete: false,
        createdAt: new Date()
      }
    })

    console.log(`Created next queue ${queueNumber} for customer ${completedQueue.customerId}`)
  } catch (error) {
    console.error('Error creating next queue in sequence:', error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { notes, internalNotes, serviceCategory } = await request.json()
    const queueId = params.id

    // Update queue with completion data
    const updateData: any = {
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedAt: new Date()
    }

    // Add service data
    if (notes !== undefined) updateData.notes = notes
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes
    if (serviceCategory) updateData.serviceCategory = serviceCategory

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

    // Check if this queue is part of a "BOTH" service sequence and create next queue if needed
    if (queue.serviceOrder && ((queue.serviceType === 'HELPDESK' && queue.serviceOrder === 'HELPDESK_FIRST') || (queue.serviceType === 'BOTH' && queue.serviceOrder === 'HELPDESK_FIRST'))) {
      // This was the first service (Helpdesk), now create TPT queue
      await createNextQueueInSequence(queue, 'TPT')
    } else if (queue.serviceOrder && ((queue.serviceType === 'TPT' && queue.serviceOrder === 'TPT_FIRST') || (queue.serviceType === 'BOTH' && queue.serviceOrder === 'TPT_FIRST'))) {
      // This was the first service (TPT), now create Helpdesk queue
      await createNextQueueInSequence(queue, 'HELPDESK')
    }

    return NextResponse.json({
      message: 'Service completed successfully',
      queue,
      feedbackUrl: `/feedback?queueId=${queueId}`
    })
  } catch (error) {
    console.error('Helpdesk service completion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}