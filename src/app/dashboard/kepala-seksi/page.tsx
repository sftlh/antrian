'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'

interface QueueStats {
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

interface QueueItem {
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
  createdAt: string
  escalatedAt?: string | null
  escalatedReason?: string | null
}

interface StaffMember {
  id: string
  name: string
}

export default function KepalaSeksiDashboard() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<QueueStats>({
    helpdesk: { waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 },
    tpt: { waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 },
    total: { waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 },
    staffPerformance: {
      helpdesk: [],
      tpt: []
    },
    escalatedCases: []
  })

  // Queue management state
  const [queues, setQueues] = useState<QueueItem[]>([])
  const [escalatedQueues, setEscalatedQueues] = useState<QueueItem[]>([])
  const [staff, setStaff] = useState<{ helpdesk: StaffMember[], tpt: StaffMember[] }>({
    helpdesk: [],
    tpt: []
  })
  const [selectedQueue, setSelectedQueue] = useState<QueueItem | null>(null)
  const [showQueueModal, setShowQueueModal] = useState(false)

  // Real-time features
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [urgentAlert, setUrgentAlert] = useState(false)

  // Helper function to calculate waiting time
  const calculateWaitingTime = (createdAt: string, status: string, calledAt?: string | null) => {
    const created = new Date(createdAt)
    const now = new Date()
    
    let endTime: Date
    if (status === 'WAITING') {
      endTime = now
    } else if (calledAt) {
      endTime = new Date(calledAt)
    } else {
      endTime = now
    }
    
    const diffMs = endTime.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    
    if (diffHours > 0) {
      return `${diffHours}j ${diffMins % 60}m`
    } else {
      return `${diffMins}m`
    }
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    } else if (user) {
      fetchStats()
      fetchQueues()
    }
  }, [user, isLoading, router])

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (autoRefresh && user) {
      interval = setInterval(() => {
        fetchStats()
        fetchQueues()
      }, refreshInterval * 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, user])

  // Monitor for urgent queues
  useEffect(() => {
    const urgentQueues = queues.filter(q => q.priorityLevel === 'URGENT' || q.status === 'WAITING')
    const hasUrgent = urgentQueues.length > 0

    if (hasUrgent && !urgentAlert) {
      setUrgentAlert(true)
      if (soundEnabled) {
        // Play notification sound
        const audio = new Audio('/notification.mp3')
        audio.play().catch(() => {
          // Fallback: browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Antrian Mendesak!', {
              body: `${urgentQueues.length} antrian membutuhkan perhatian segera`,
              icon: '/favicon.ico'
            })
          }
        })
      }
    } else if (!hasUrgent && urgentAlert) {
      setUrgentAlert(false)
    }
  }, [queues, urgentAlert, soundEnabled])

  const fetchStats = async () => {
    try {
      setIsRefreshing(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchQueues = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/queues', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQueues(data.queues)
        setEscalatedQueues(data.escalatedQueues || [])
        setStaff(data.staff)
      }
    } catch (error) {
      console.error('Failed to fetch queues:', error)
    }
  }

  const handleQueueAction = async (queueId: string, action: string, staffId?: string, priorityLevel?: string, notes?: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/queues', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queueId,
          action,
          staffId,
          priorityLevel,
          notes
        })
      })

      if (response.ok) {
        // Refresh both stats and queues
        fetchStats()
        fetchQueues()
        // Only close modal for non-escalated cases or after certain actions
        if (action === 'cancel' || !selectedQueue?.escalatedAt) {
          setShowQueueModal(false)
          setSelectedQueue(null)
        }
        // For escalated cases, keep modal open so user can perform multiple actions
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update queue:', error)
      alert('Failed to update queue')
    }
  }

  const handleEscalateToHelpdesk = async (queueId: string, reason: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/escalate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queueId,
          reason
        })
      })

      if (response.ok) {
        // Refresh both stats and queues
        fetchStats()
        fetchQueues()
        setShowQueueModal(false)
        setSelectedQueue(null)
        alert('Antrian berhasil dieskalasi ke Helpdesk')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to escalate queue:', error)
      alert('Failed to escalate queue')
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Clean Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">KS</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Kepala Seksi</h1>
                <p className="text-sm text-gray-600">Monitoring & Kontrol Sistem Antrian</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                👋 <span className="font-medium">{user.name}</span>
              </div>
              <button
                onClick={() => {
                  logout()
                  router.push('/')
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                🚪 Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Compact Live Status Bar */}
        <div className={`bg-white rounded-xl shadow-sm border p-4 mb-8 ${urgentAlert ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  Live: {autoRefresh ? 'Aktif' : 'Non-aktif'}
                </span>
                {urgentAlert && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full animate-pulse">
                    🚨 ANTRIAN MENDESAK
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Interval:</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                  disabled={!autoRefresh}
                >
                  <option value={10}>10d</option>
                  <option value={30}>30d</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                </select>
              </div>

              <div className="text-sm text-gray-600">
                Update: {lastRefresh.toLocaleTimeString()}
                {isRefreshing && <span className="ml-2 text-blue-600">⟳</span>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => {
                    setSoundEnabled(e.target.checked)
                    if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission()
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>🔔 Notif</span>
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    autoRefresh
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {autoRefresh ? '⏸️ Pause' : '▶️ Start'}
                </button>

                <button
                  onClick={() => {
                    fetchStats()
                    fetchQueues()
                  }}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRefreshing ? '⟳' : '🔄'} Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Helpdesk Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">💬</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Helpdesk</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Menunggu</span>
                <span className="font-bold text-yellow-600 text-lg">{stats.helpdesk.waiting}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Proses</span>
                <span className="font-bold text-blue-600 text-lg">{stats.helpdesk.inProgress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Selesai</span>
                <span className="font-bold text-green-600 text-lg">{stats.helpdesk.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Eskalasi</span>
                <span className="font-bold text-red-600 text-lg">{stats.helpdesk.escalated}</span>
              </div>
            </div>
          </div>

          {/* TPT Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">🛠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">TPT</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Menunggu</span>
                <span className="font-bold text-yellow-600 text-lg">{stats.tpt.waiting}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Proses</span>
                <span className="font-bold text-blue-600 text-lg">{stats.tpt.inProgress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Selesai</span>
                <span className="font-bold text-green-600 text-lg">{stats.tpt.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Eskalasi</span>
                <span className="font-bold text-red-600 text-lg">{stats.tpt.escalated}</span>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📊</span>
              </div>
              <h3 className="text-lg font-semibold">Total Hari Ini</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-90">Menunggu</span>
                <span className="font-bold text-xl">{stats.total.waiting}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-90">Proses</span>
                <span className="font-bold text-xl">{stats.total.inProgress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-90">Selesai</span>
                <span className="font-bold text-xl">{stats.total.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-90">Eskalasi</span>
                <span className="font-bold text-xl">{stats.total.escalated}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Aksi Cepat</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => fetchStats()}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                🔄 Refresh Data
              </button>
              <button
                onClick={() => fetchQueues()}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                📋 Load Antrian
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {autoRefresh ? '⏸️ Pause Live' : '▶️ Start Live'}
              </button>
            </div>
          </div>
        </div>

          {/* Staff Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Helpdesk Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">👨‍💼</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Performa Helpdesk</h3>
                  <p className="text-sm text-gray-600">Tim bantuan umum</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats.staffPerformance.helpdesk.map((staff) => (
                  <div key={staff.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">{staff.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{staff.name}</div>
                        <div className="text-sm text-gray-600">{staff.completedToday} selesai hari ini</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        {staff.averageRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">⭐ Rating</div>
                    </div>
                  </div>
                ))}
                {stats.staffPerformance.helpdesk.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Tidak ada data performa helpdesk</p>
                  </div>
                )}
              </div>
            </div>

            {/* TPT Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-lg">👨‍💻</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Performa TPT</h3>
                  <p className="text-sm text-gray-600">Tim dukungan teknis</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats.staffPerformance.tpt.map((staff) => (
                  <div key={staff.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">{staff.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{staff.name}</div>
                        <div className="text-sm text-gray-600">{staff.completedToday} selesai hari ini</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-purple-600">
                        {staff.averageRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">⭐ Rating</div>
                    </div>
                  </div>
                ))}
                {stats.staffPerformance.tpt.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Tidak ada data performa TPT</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Queue Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 text-lg">⚙️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Antrian Live</h3>
                  <p className="text-sm text-gray-600">Pantau dan kelola antrian secara real-time</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-600 font-medium">
                    {queues.length} antrian aktif • {escalatedQueues.length} dieskalasi dari TPT
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                    Menunggu: {queues.filter(q => q.status === 'WAITING').length}
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Dipanggil: {queues.filter(q => q.status === 'CALLED').length}
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Dalam Proses: {queues.filter(q => q.status === 'IN_PROGRESS').length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Update: {lastRefresh.toLocaleTimeString()}</span>
                  <button
                    onClick={fetchQueues}
                    disabled={isRefreshing}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {isRefreshing ? '🔄' : '🔄'} Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {queues.map((queue) => (
                <div key={queue.id} className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                  queue.priorityLevel === 'URGENT' ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50 shadow-md' :
                  queue.priorityLevel === 'HIGH' ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`font-bold text-xl ${
                        queue.priorityLevel === 'URGENT' ? 'text-red-600' :
                        queue.priorityLevel === 'HIGH' ? 'text-yellow-600' :
                        'text-indigo-600'
                      }`}>
                        {queue.queueNumber}
                        {queue.priorityLevel === 'URGENT' && <span className="ml-1 animate-pulse">🚨</span>}
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        queue.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        queue.status === 'CALLED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        queue.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {queue.status === 'WAITING' ? 'Menunggu' :
                         queue.status === 'CALLED' ? 'Dipanggil' :
                         queue.status === 'IN_PROGRESS' ? 'Dalam Proses' :
                         queue.status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        queue.serviceType === 'HELPDESK' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        queue.serviceType === 'TPT' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {queue.serviceType}
                      </span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        queue.priorityLevel === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        queue.priorityLevel === 'URGENT' ? 'bg-red-100 text-red-900 border border-red-200 font-bold animate-pulse' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {queue.priorityLevel === 'HIGH' ? 'TINGGI' :
                         queue.priorityLevel === 'URGENT' ? 'MENDESAK ⚡' :
                         'Normal'}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 mb-3 font-medium">
                    <strong className="text-gray-900">{queue.customerName}</strong> 
                    <span className="text-gray-600"> • NPWP: {queue.customerNpwp}</span>
                    {queue.customerPhone && <span className="text-gray-600"> • Telp: {queue.customerPhone}</span>}
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <span>Dibuat: {new Date(queue.createdAt).toLocaleString()}</span>
                      <span className="font-medium text-indigo-600">⏱️ Menunggu: {calculateWaitingTime(queue.createdAt, queue.status, queue.calledAt)}</span>
                      {queue.calledBy && <span>• Ditangani: {queue.calledBy}</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {queue.notes && <span>📝 {queue.notes}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {queues.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-lg font-medium">Tidak ada antrian aktif saat ini</p>
                  <p className="text-sm">Semua antrian telah selesai diproses</p>
                </div>
              )}
            </div>
          </div>

          {/* Escalated Cases from TPT */}
          {escalatedQueues.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-lg">🚨</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Kasus Dieskalasi dari TPT</h3>
                  <p className="text-sm text-gray-600">Kasus teknis yang membutuhkan perhatian kepala seksi</p>
                </div>
              </div>
              <div className="space-y-4">
                {escalatedQueues.map((queue) => (
                  <div key={queue.id} className="border border-red-200 rounded-lg p-4 bg-gradient-to-r from-red-50 to-pink-50 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{queue.queueNumber}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-red-800">{queue.serviceType}</div>
                          <div className="text-sm text-gray-600">
                            Dieskalasi pada {queue.escalatedAt ? new Date(queue.escalatedAt).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                          DIESKALASI DARI TPT
                        </div>
                        <button
                          onClick={() => {
                            setSelectedQueue(queue)
                            setShowQueueModal(true)
                          }}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500 transition-colors"
                        >
                          Kelola
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <strong className="text-gray-900">{queue.customerName}</strong>
                      <span className="text-gray-600"> • NPWP: {queue.customerNpwp}</span>
                      {queue.customerPhone && <span className="text-gray-600"> • Telp: {queue.customerPhone}</span>}
                    </div>
                    <div className="text-sm text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                      <strong>Alasan:</strong> {queue.escalatedReason || 'Tidak ada alasan spesifik'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">📊</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Aktivitas Live</h3>
                  <p className="text-sm text-gray-600">Monitor aktivitas sistem secara real-time</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-gray-600 font-medium">Real-time</span>
              </div>
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto">
              {/* Recent Queue Activities */}
              <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📈</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Total Antrian Hari Ini
                      </div>
                      <div className="text-xs text-gray-600">
                        Helpdesk: {stats.helpdesk.waiting + stats.helpdesk.inProgress + stats.helpdesk.completed} |
                        TPT: {stats.tpt.waiting + stats.tpt.inProgress + stats.tpt.completed}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {lastRefresh.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Active Staff Status */}
              <div className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">👥</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      Status Staff Aktif
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Helpdesk:</span>
                        <span className="font-medium text-blue-600">{staff.helpdesk.length} staff tersedia</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TPT:</span>
                        <span className="font-medium text-purple-600">{staff.tpt.length} staff tersedia</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Status Summary */}
              <div className="border-l-4 border-yellow-500 pl-4 py-3 bg-yellow-50 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm">⏱️</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                      Status Antrian Saat Ini
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between items-center p-2 bg-white rounded border">
                        <span className="text-gray-600">Menunggu:</span>
                        <span className="font-bold text-yellow-600">{stats.total.waiting}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded border">
                        <span className="text-gray-600">Dalam Proses:</span>
                        <span className="font-bold text-blue-600">{stats.total.inProgress}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded border">
                        <span className="text-gray-600">Selesai:</span>
                        <span className="font-bold text-green-600">{stats.total.completed}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded border">
                        <span className="text-gray-600">Dieskalasi:</span>
                        <span className="font-bold text-red-600">{stats.total.escalated}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">⭐</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      Performa Hari Ini
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Rata-rata Rating Helpdesk:</span>
                        <span className="font-medium text-blue-600">{
                          stats.staffPerformance.helpdesk.length > 0
                            ? (stats.staffPerformance.helpdesk.reduce((sum, staff) => sum + staff.averageRating, 0) / stats.staffPerformance.helpdesk.length).toFixed(1)
                            : '0.0'
                        }</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rata-rata Rating TPT:</span>
                        <span className="font-medium text-purple-600">{
                          stats.staffPerformance.tpt.length > 0
                            ? (stats.staffPerformance.tpt.reduce((sum, staff) => sum + staff.averageRating, 0) / stats.staffPerformance.tpt.length).toFixed(1)
                            : '0.0'
                        }</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="border-l-4 border-gray-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm">🔄</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      Status Sistem
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Auto-refresh:</span>
                        <span className={`font-medium ${autoRefresh ? 'text-green-600' : 'text-gray-500'}`}>
                          {autoRefresh ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interval:</span>
                        <span className="font-medium text-gray-900">{refreshInterval} detik</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Terakhir update:</span>
                        <span className="font-medium text-gray-900">{lastRefresh.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Escalated Cases */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-lg">🚨</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Kasus Dieskalasi</h3>
                <p className="text-sm text-gray-600">Kasus yang telah dieskalasi ke Helpdesk</p>
              </div>
            </div>
            <div className="space-y-4">
              {stats.escalatedCases.map((case_) => (
                <div key={case_.id} className="border border-red-200 rounded-lg p-4 bg-gradient-to-r from-red-50 to-pink-50 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{case_.queueNumber}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-red-800">{case_.serviceType}</div>
                        <div className="text-sm text-gray-600">Dieskalasi pada {new Date(case_.escalatedAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                      DIESKALASI
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    <strong className="text-gray-900">{case_.customerName}</strong> 
                    <span className="text-gray-600"> • NPWP: {case_.customerNpwp}</span>
                  </div>
                  <div className="text-sm text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                    <strong>Alasan:</strong> {case_.escalatedReason}
                  </div>
                </div>
              ))}
              {stats.escalatedCases.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-lg font-medium">Tidak ada kasus yang dieskalasi hari ini</p>
                  <p className="text-sm">Semua antrian ditangani dengan baik</p>
                </div>
              )}
            </div>
          </div>

          {/* Queue Management Modal */}
          {showQueueModal && selectedQueue && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Kelola Antrian {selectedQueue.queueNumber}
                </h3>
                <button
                  onClick={() => setShowQueueModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm">
                    <strong>Pelanggan:</strong> {selectedQueue.customerName} (NPWP: {selectedQueue.customerNpwp})<br/>
                    <strong>Layanan:</strong> {selectedQueue.serviceType}<br/>
                    <strong>Status:</strong> {selectedQueue.status}<br/>
                    <strong>Prioritas:</strong> {selectedQueue.priorityLevel}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Call Customer */}
                {selectedQueue.status === 'WAITING' && (
                  <button
                    onClick={() => handleQueueAction(selectedQueue.id, 'call')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    📢 Panggil Pelanggan
                  </button>
                )}

                {/* Start Service */}
                {(selectedQueue.status === 'WAITING' || selectedQueue.status === 'CALLED') && (
                  <button
                    onClick={() => handleQueueAction(selectedQueue.id, 'start')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    ▶️ Mulai Layanan
                  </button>
                )}

                {/* Reassign to Staff - Only show for non-escalated queues */}
                {!selectedQueue.escalatedAt && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alihkan ke Staff:
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleQueueAction(selectedQueue.id, 'reassign', e.target.value)
                        }
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      defaultValue=""
                    >
                      <option value="">Pilih Staff...</option>
                      {(selectedQueue.serviceType === 'HELPDESK' ? staff.helpdesk : staff.tpt).map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Change Priority */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubah Prioritas:
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleQueueAction(selectedQueue.id, 'priority', undefined, e.target.value)
                      }
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    defaultValue=""
                  >
                    <option value="">Pilih Prioritas...</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="URGENT">Mendesak</option>
                  </select>
                </div>

                {/* Escalate to Helpdesk */}
                <button
                  onClick={() => {
                    const reason = prompt('Masukkan alasan escalation ke Helpdesk:')
                    if (reason) {
                      handleEscalateToHelpdesk(selectedQueue.id, reason)
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  🚨 Eskalasi ke Helpdesk
                </button>

                {/* Close button for escalated cases */}
                {selectedQueue.escalatedAt && (
                  <button
                    onClick={() => {
                      setShowQueueModal(false)
                      setSelectedQueue(null)
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    ❌ Tutup
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}