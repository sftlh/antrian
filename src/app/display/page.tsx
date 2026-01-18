'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface PublicQueue {
  id: string
  queueNumber: string
  serviceType: string
  status: string
  priorityLevel: string
  customerName: string
  customerNpwp: string
  counter?: string
  createdAt: string
  calledAt?: string
  startedAt?: string
}

interface PublicQueueStats {
  totalWaiting: number
  totalInProgress: number
  totalCompleted: number
  helpdeskWaiting: number
  tptWaiting: number
  helpdeskInProgress: number
  tptInProgress: number
}

export default function DisplayPage() {
  const [queues, setQueues] = useState<PublicQueue[]>([])
  const [stats, setStats] = useState<PublicQueueStats>({
    totalWaiting: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    helpdeskWaiting: 0,
    tptWaiting: 0,
    helpdeskInProgress: 0,
    tptInProgress: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Audio state
  const [isMuted, setIsMuted] = useState(true)
  const announcedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
    // Auto-refresh every 5 seconds (faster for audio responsiveness)
    const interval = setInterval(fetchData, 5000)
    // Update current time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      clearInterval(interval)
      clearInterval(timeInterval)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      
      // Stop speaking when unmounting or if effect re-runs (e.g. mute toggled)
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isMuted]) // Re-run effect if mute status changes to ensure announce logic has fresh state if needed

  const announceQueue = (queue: PublicQueue) => {
    if (!('speechSynthesis' in window)) return

    // Note: We do NOT cancel() here to allow multiple announcements to queue up naturally
    // window.speechSynthesis.cancel() 

    // Format text: "Nomor Antrian [A 001]. Silakan menuju [Loket Helpdesk]"
    // Spacing with dots helps the TTS pause naturally
    // Use dynamic counter if available, otherwise default based on service type
    const destination = queue.counter || (queue.serviceType === 'HELPDESK' ? 'Loket Helpdesk' : 'Loket Te Pe Te')
    
    // Split queue number for better pronunciation (e.g. A-0-0-1 instead of "A zero zero one")
    const spokenQueueNumber = queue.queueNumber.split('').join(' ') 
    
    // Clean customer name (remove special chars that might confuse TTS)
    const spokenName = queue.customerName.replace(/[^\w\s]/gi, '')

    const text = `Nomor antrian. ${spokenQueueNumber}. Atas nama ${spokenName}. Silakan menuju ${destination}.`

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'id-ID' // Try Indonesian first
    utterance.rate = 0.85     // Slightly slower is clearer
    utterance.pitch = 1
    utterance.volume = 1

    // Fallback if ID voice isn't great, but modern browsers usually handle it okay
    window.speechSynthesis.speak(utterance)
  }

  const fetchData = async () => {
    try {
      // console.log('🔄 Fetching queue data...')
      // setError(null) // Don't clear error immediately to avoid flickering if it persists
      setConnectionStatus('checking')

      // Fetch current queues with cache-busting parameter
      const queuesResponse = await fetch(`/api/public/queues?t=${Date.now()}`)

      if (!queuesResponse.ok) {
        throw new Error(`API responded with status: ${queuesResponse.status} ${queuesResponse.statusText}`)
      }

      const queuesData = await queuesResponse.json()

      if (queuesData.error) {
        throw new Error(queuesData.error)
      }

      const newQueues = queuesData.queues || []
      setQueues(newQueues)
      setStats(queuesData.stats || {
        totalWaiting: 0,
        totalInProgress: 0,
        totalCompleted: 0,
        helpdeskWaiting: 0,
        tptWaiting: 0,
        helpdeskInProgress: 0,
        tptInProgress: 0
      })
      setLastUpdate(new Date())
      setConnectionStatus('connected')
      setError(null)

      // Audio Announcement Logic
      // Only process announcements if NOT muted to ensure we catch up when unmuted
      if (!isMuted) {
        newQueues.forEach((q: PublicQueue) => {
          if (q.status === 'CALLED' || q.status === 'IN_PROGRESS') {
            // Create a composite key to detect Re-calls (same ID, new time)
            const uniqueKey = q.calledAt 
              ? `${q.id}-${new Date(q.calledAt).getTime()}` 
              : `${q.id}-initial`
              
            if (!announcedRef.current.has(uniqueKey)) {
              // Determine if we should announce based on "staleness"
              // Prevent flooding announcements for old IN_PROGRESS items when just unmuted
              let shouldAnnounce = false
              
              if (q.status === 'CALLED') {
                shouldAnnounce = true // Always announce CALLED
              } else if (q.status === 'IN_PROGRESS') {
                // Only announce IN_PROGRESS if it started recently (e.g., last 2 minutes)
                if (q.startedAt) {
                  const startTime = new Date(q.startedAt).getTime()
                  const now = new Date().getTime()
                  // 2 minutes = 120000 ms
                  if (now - startTime < 120000) {
                    shouldAnnounce = true
                  }
                } else {
                   // Fallback if no startedAt but status changed recently (inferred)
                   shouldAnnounce = true 
                }
              }

              if (shouldAnnounce) {
                announceQueue(q)
              }
              
              // Mark as handled so we don't process again
              announcedRef.current.add(uniqueKey)
            }
          }
        })
      }

    } catch (error) {
      console.error('❌ Failed to fetch data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to load queue data: ${errorMessage}`)
      setConnectionStatus('disconnected')
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

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat tampilan publik...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-100 ${isFullscreen ? 'fixed inset-0 z-50 overflow-hidden' : 'p-4'}`}>
      <div className={`bg-white shadow rounded-lg h-full flex flex-col ${isFullscreen ? 'rounded-none h-screen' : ''}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-2xl font-bold">KPP</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Tampilan Publik Antrian</h2>
                <p className="text-indigo-100 text-lg">Kantor Pelayanan Pajak Madya Dua Surabaya</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-xl mb-1 font-medium text-indigo-100">
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-4xl font-bold tabular-nums">
                  {currentTime.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
              <button
                onClick={toggleFullscreen}
                className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              >
                {isFullscreen ? (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3l-6 6m0 0V4m0 5h5M3 21l6-6m0 0v5m0-5H4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col overflow-hidden">
          {/* Connection Status and Refresh */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {connectionStatus === 'connected' ? 'Terhubung' :
                   connectionStatus === 'disconnected' ? 'Terputus' : 'Menghubungkan...'}
                </span>
              </div>
              
              {/* Audio Toggle Button */}
               <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full shadow-sm border transition-all ${
                  isMuted 
                    ? 'bg-gray-100 text-gray-500 border-gray-200' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200'
                }`}
                title={isMuted ? "Aktifkan Suara Panggilan" : "Nonaktifkan Suara"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span className="text-sm font-medium">{isMuted ? 'Suara Mati' : 'Suara Aktif'}</span>
              </button>

              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  Pembaruan terakhir: {lastUpdate.toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>
            {/* Refresh button removed as per requirement */}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg shrink-0">
              <div className="flex items-center">
                <div className="text-red-600 mr-2">⚠️</div>
                <div className="text-red-800 text-sm font-medium">{error}</div>
              </div>
            </div>
          )}

          {/* Statistics Overview */}
          <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-gray-50 to-white border border-gray-200 shadow-sm shrink-0">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Status Antrian Hari Ini
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm transition-transform hover:scale-105">
                <div className="text-4xl font-black text-yellow-600 mb-2 tabular-nums">{stats.totalWaiting}</div>
                <div className="text-sm font-bold text-yellow-800 uppercase tracking-wide">Menunggu</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-sm transition-transform hover:scale-105">
                <div className="text-4xl font-black text-blue-600 mb-2 tabular-nums">{stats.totalInProgress}</div>
                <div className="text-sm font-bold text-blue-800 uppercase tracking-wide">Sedang Dilayani</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200 shadow-sm transition-transform hover:scale-105">
                <div className="text-4xl font-black text-green-600 mb-2 tabular-nums">{stats.totalCompleted}</div>
                <div className="text-sm font-bold text-green-800 uppercase tracking-wide">Selesai</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200 shadow-sm transition-transform hover:scale-105">
                <div className="text-4xl font-black text-purple-600 mb-2 tabular-nums">{stats.helpdeskWaiting + stats.tptWaiting}</div>
                <div className="text-sm font-bold text-purple-800 uppercase tracking-wide">Total Antrian</div>
              </div>
            </div>
          </div>

          {/* Current Queues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
            {/* Helpdesk Queues */}
            <div className="flex flex-col min-h-0 bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="bg-blue-50/80 px-6 py-4 border-b border-blue-100 flex justify-between items-center backdrop-blur-sm">
                <h3 className="text-xl font-bold text-blue-800 flex items-center">
                  <span className="w-3 h-8 bg-blue-500 rounded-full mr-3"></span>
                  Helpdesk
                </h3>
                <span className="bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                  {queues.filter(q => q.serviceType === 'HELPDESK' && q.status !== 'COMPLETED').length} Antrian
                </span>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {queues.filter(q => q.serviceType === 'HELPDESK').length > 0 ? (
                  queues.filter(q => q.serviceType === 'HELPDESK').map((queue) => (
                    <div key={queue.id} className={`flex items-center justify-between p-5 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${
                        queue.status === 'CALLED' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/20' : 
                        queue.status === 'IN_PROGRESS' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'
                      }`}>
                      <div className="flex items-center space-x-5">
                        <div className="min-w-[4.5rem] text-center">
                          <div className={`text-3xl font-black ${
                            queue.status === 'CALLED' ? 'text-blue-600' : 
                            queue.status === 'IN_PROGRESS' ? 'text-green-600' : 'text-gray-700'
                          }`}>
                            {queue.queueNumber}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">Nomor</div>
                        </div>
                        <div className="flex flex-col border-l pl-5 py-1">
                          <div className="font-bold text-gray-900 text-lg line-clamp-1">{queue.customerName}</div>
                          <div className="text-sm text-gray-500 font-mono tracking-wide">{queue.customerNpwp}</div>
                          {queue.counter && (
                            <div className="mt-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block self-start border border-blue-100">
                              📍 {queue.counter}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-4 py-1.5 text-sm font-bold rounded-full border shadow-sm ${getStatusColor(queue.status)}`}>
                          {getStatusText(queue.status)}
                        </span>
                        {queue.priorityLevel === 'HIGH' && (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                            Prioritas
                          </span>
                        )}
                        {queue.priorityLevel === 'URGENT' && (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
                            Mendesak
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <p className="text-lg font-medium">Tidak ada antrian Helpdesk</p>
                  </div>
                )}
              </div>
            </div>

            {/* TPT Queues */}
            <div className="flex flex-col min-h-0 bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
               <div className="bg-purple-50/80 px-6 py-4 border-b border-purple-100 flex justify-between items-center backdrop-blur-sm">
                <h3 className="text-xl font-bold text-purple-800 flex items-center">
                  <span className="w-3 h-8 bg-purple-500 rounded-full mr-3"></span>
                  TPT (Tempat Pelayanan Terpadu)
                </h3>
                 <span className="bg-purple-200 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">
                  {queues.filter(q => q.serviceType === 'TPT' && q.status !== 'COMPLETED').length} Antrian
                </span>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {queues.filter(q => q.serviceType === 'TPT').length > 0 ? (
                  queues.filter(q => q.serviceType === 'TPT').map((queue) => (
                    <div key={queue.id} className={`flex items-center justify-between p-5 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${
                        queue.status === 'CALLED' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500/20' : 
                        queue.status === 'IN_PROGRESS' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'
                      }`}>
                      <div className="flex items-center space-x-5">
                        <div className="min-w-[4.5rem] text-center">
                          <div className={`text-3xl font-black ${
                            queue.status === 'CALLED' ? 'text-purple-600' : 
                            queue.status === 'IN_PROGRESS' ? 'text-green-600' : 'text-gray-700'
                          }`}>
                            {queue.queueNumber}
                          </div>
                           <div className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">Nomor</div>
                        </div>
                        <div className="flex flex-col border-l pl-5 py-1">
                          <div className="font-bold text-gray-900 text-lg line-clamp-1">{queue.customerName}</div>
                          <div className="text-sm text-gray-500 font-mono tracking-wide">{queue.customerNpwp}</div>
                          {queue.counter && (
                            <div className="mt-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md inline-block self-start border border-purple-100">
                              📍 {queue.counter}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-4 py-1.5 text-sm font-bold rounded-full border shadow-sm ${getStatusColor(queue.status)}`}>
                          {getStatusText(queue.status)}
                        </span>
                        {queue.priorityLevel === 'HIGH' && (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                            Prioritas
                          </span>
                        )}
                        {queue.priorityLevel === 'URGENT' && (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
                            Mendesak
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                   <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-lg font-medium">Tidak ada antrian TPT</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 20px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  )
}
