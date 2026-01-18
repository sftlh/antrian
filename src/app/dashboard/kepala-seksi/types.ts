export interface QueueStats {
  helpdesk: {
    waiting: number
    inProgress: number
    completed: number
    escalated: number
    cancelled: number
  }
  tpt: {
    waiting: number
    inProgress: number
    completed: number
    escalated: number
    cancelled: number
  }
  total: {
    waiting: number
    inProgress: number
    completed: number
    escalated: number
    cancelled: number
  }
  staffPerformance: {
    helpdesk: Array<{
      id: string
      name: string
      completedToday: number
      averageRating: number
    }>
    tpt: Array<{
      id: string
      name: string
      completedToday: number
      averageRating: number
    }>
  }
  escalatedCases: Array<{
    id: string
    queueNumber: string
    serviceType: string
    customerName: string
    customerNpwp: string
    escalatedAt: string
    escalatedReason: string
  }>
}

export interface QueueItem {
  id: string
  queueNumber: string
  serviceType: string
  status: string
  priorityLevel: string
  customerName: string
  customerNpwp: string
  customerPhone: string | null
  calledBy: string | null
  calledById: string | null
  calledAt: string | null
  startedAt: string | null
  notes: string | null
  rating: number | null
  feedback: string | null
  createdAt: string
  escalatedAt?: string | null
  escalatedReason?: string | null
}

export interface StaffMember {
  id: string
  name: string
}
