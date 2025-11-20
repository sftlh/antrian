'use client'

import { useState, useEffect } from 'react'

interface Queue {
  id: string
  queueNumber: string
  serviceType: string
  status: string
  priorityLevel: string
  customerName: string
  customerNpwp: string
  createdAt: string
  calledAt?: string
  startedAt?: string
}

interface QueueStats {
  totalWaiting: number
  totalInProgress: number
  totalCompleted: number
  helpdeskWaiting: number
  tptWaiting: number
  helpdeskInProgress: number
  tptInProgress: number
}

export default function PublicLandingPage() {
  const [queues, setQueues] = useState<Queue[]>([])
  const [stats, setStats] = useState<QueueStats>({
    totalWaiting: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    helpdeskWaiting: 0,
    tptWaiting: 0,
    helpdeskInProgress: 0,
    tptInProgress: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    // Update current time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)

    // Auto-enter fullscreen mode
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
          setIsFullscreen(true)
        }
      } catch (error) {
        console.log('Fullscreen not supported or denied')
      }
    }

    // Enter fullscreen after a short delay to ensure page is loaded
    const fullscreenTimer = setTimeout(enterFullscreen, 2000)

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      clearInterval(interval)
      clearInterval(timeInterval)
      clearTimeout(fullscreenTimer)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const fetchData = async () => {
    try {
      // Fetch current queues
      const queuesResponse = await fetch('/api/public/queues')
      if (queuesResponse.ok) {
        const queuesData = await queuesResponse.json()
        setQueues(queuesData.queues)
        setStats(queuesData.stats)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CALLED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800 border-green-200'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WAITING': return 'Menunggu'
      case 'CALLED': return 'Dipanggil'
      case 'IN_PROGRESS': return 'Sedang Dilayani'
      case 'COMPLETED': return 'Selesai'
      default: return status
    }
  }

  const getServiceTypeText = (serviceType: string) => {
    switch (serviceType) {
      case 'HELPDESK': return 'Helpdesk'
      case 'TPT': return 'TPT'
      case 'BOTH': return 'Helpdesk & TPT'
      default: return serviceType
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat informasi antrian...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Fullscreen Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={async () => {
            if (isFullscreen) {
              if (document.exitFullscreen) {
                await document.exitFullscreen()
              }
            } else {
              if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen()
              }
            }
          }}
          className="bg-white/90 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-colors border border-gray-200"
        >
          {isFullscreen ? '🗗 Exit Fullscreen' : '🗗 Fullscreen'}
        </button>
      </div>
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl font-bold">KPP</span>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Kantor Pelayanan Pajak</h1>
                <p className="text-lg text-gray-600">Madya Dua Surabaya</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg text-gray-600 mb-1">
                {currentTime.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-gray-900">
                {currentTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 gap-12">
          {/* Queue Status */}
          <div>
            {/* Statistics Overview */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-8">Status Antrian Hari Ini</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-4xl font-bold text-yellow-600 mb-2">{stats.totalWaiting}</div>
                  <div className="text-lg text-yellow-800">Menunggu</div>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{stats.totalInProgress}</div>
                  <div className="text-lg text-blue-800">Sedang Dilayani</div>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-4xl font-bold text-green-600 mb-2">{stats.totalCompleted}</div>
                  <div className="text-lg text-green-800">Selesai</div>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-4xl font-bold text-purple-600 mb-2">{stats.helpdeskWaiting + stats.tptWaiting}</div>
                  <div className="text-lg text-purple-800">Total Antrian</div>
                </div>
              </div>
            </div>

            {/* Current Queues */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Antrian Saat Ini</h2>
                <div className="text-lg text-gray-600">
                  Update otomatis setiap 30 detik
                </div>
              </div>

              {/* Helpdesk Queues */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-blue-600 mb-4">Helpdesk</h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {queues.filter(q => q.serviceType === 'HELPDESK').length > 0 ? (
                    queues.filter(q => q.serviceType === 'HELPDESK').map((queue) => (
                      <div key={queue.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl font-bold text-blue-900 min-w-0">
                            {queue.queueNumber}
                          </div>
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900">{queue.customerName}</div>
                            <div className="text-sm text-gray-600">{queue.customerNpwp}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(queue.status)}`}>
                            {getStatusText(queue.status)}
                          </span>
                          {queue.priorityLevel === 'HIGH' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                              Prioritas
                            </span>
                          )}
                          {queue.priorityLevel === 'URGENT' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                              Mendesak
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-lg">Tidak ada antrian Helpdesk saat ini</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TPT Queues */}
              <div>
                <h3 className="text-xl font-semibold text-purple-600 mb-4">TPT (Tempat Pelayanan Terpadu)</h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {queues.filter(q => q.serviceType === 'TPT').length > 0 ? (
                    queues.filter(q => q.serviceType === 'TPT').map((queue) => (
                      <div key={queue.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl font-bold text-purple-900 min-w-0">
                            {queue.queueNumber}
                          </div>
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900">{queue.customerName}</div>
                            <div className="text-sm text-gray-600">{queue.customerNpwp}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(queue.status)}`}>
                            {getStatusText(queue.status)}
                          </span>
                          {queue.priorityLevel === 'HIGH' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                              Prioritas
                            </span>
                          )}
                          {queue.priorityLevel === 'URGENT' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                              Mendesak
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-lg">Tidak ada antrian TPT saat ini</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}