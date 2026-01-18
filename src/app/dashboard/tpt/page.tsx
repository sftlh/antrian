'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import ServiceHistory from '@/components/ServiceHistory'
import UserAvatar from '@/components/UserAvatar'
import QueueTimer from '@/components/QueueTimer'

interface Queue {
  id: string
  queueNumber: string
  customer: {
    id: string
    name: string
    npwp: string
  }
  serviceCategory?: string
  priorityLevel?: string
  status: string
  createdAt: string
  notes?: string
  internalNotes?: string
  completedAt?: string
  serviceDuration?: number
  rating?: number
  feedback?: string
}

export default function TPTDashboard() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'service' | 'history'>('service')
  const [queues, setQueues] = useState<Queue[]>([])
  const [currentQueue, setCurrentQueue] = useState<Queue | null>(null)
  const [serviceCompleted, setServiceCompleted] = useState(false)
  const [serviceNotes, setServiceNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [priorityLevel, setPriorityLevel] = useState('NORMAL')
  const [serviceStartTime, setServiceStartTime] = useState<Date | null>(null)
  const [customLocation, setCustomLocation] = useState<string>('loket TPT')

  // Load persisted state from localStorage on mount
  useEffect(() => {
    const savedServiceCompleted = localStorage.getItem('tpt_service_completed')
    if (savedServiceCompleted === 'true') {
      setServiceCompleted(true)
    }

    const savedCurrentQueue = localStorage.getItem('tpt_current_queue')
    if (savedCurrentQueue) {
      try {
        setCurrentQueue(JSON.parse(savedCurrentQueue))
      } catch (error) {
        console.error('Failed to parse saved current queue:', error)
      }
    }

    const savedServiceNotes = localStorage.getItem('tpt_service_notes')
    if (savedServiceNotes) {
      setServiceNotes(savedServiceNotes)
    }

    const savedInternalNotes = localStorage.getItem('tpt_internal_notes')
    if (savedInternalNotes) {
      setInternalNotes(savedInternalNotes)
    }

    const savedServiceCategory = localStorage.getItem('tpt_service_category')
    if (savedServiceCategory) {
      setServiceCategory(savedServiceCategory)
    }

    const savedPriorityLevel = localStorage.getItem('tpt_priority_level')
    if (savedPriorityLevel) {
      setPriorityLevel(savedPriorityLevel)
    }

    const savedServiceStartTime = localStorage.getItem('tpt_service_start_time')
    if (savedServiceStartTime) {
      try {
        setServiceStartTime(new Date(savedServiceStartTime))
      } catch (error) {
        console.error('Failed to parse saved service start time:', error)
      }
    }

  }, [])

  // Save service completion state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tpt_service_completed', serviceCompleted.toString())
  }, [serviceCompleted])

  useEffect(() => {
    if (currentQueue) {
      localStorage.setItem('tpt_current_queue', JSON.stringify(currentQueue))
    } else {
      localStorage.removeItem('tpt_current_queue')
    }
  }, [currentQueue])

  useEffect(() => {
    localStorage.setItem('tpt_service_notes', serviceNotes)
  }, [serviceNotes])

  useEffect(() => {
    localStorage.setItem('tpt_internal_notes', internalNotes)
  }, [internalNotes])

  useEffect(() => {
    localStorage.setItem('tpt_service_category', serviceCategory)
  }, [serviceCategory])

  useEffect(() => {
    localStorage.setItem('tpt_priority_level', priorityLevel)
  }, [priorityLevel])

  useEffect(() => {
    if (serviceStartTime) {
      localStorage.setItem('tpt_service_start_time', serviceStartTime.toISOString())
    } else {
      localStorage.removeItem('tpt_service_start_time')
    }
  }, [serviceStartTime])
  const [serviceTemplates, setServiceTemplates] = useState<any[]>([])
  const [customerHistory, setCustomerHistory] = useState<Queue[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [historyFilter, setHistoryFilter] = useState('all')
  const [dailyStats, setDailyStats] = useState({
    servicesCompleted: 0,
    averageRating: 0,
    totalDuration: 0,
    averageDuration: 0
  })
  const [showBreakReminder, setShowBreakReminder] = useState(false)
  const [showEndOfDaySummary, setShowEndOfDaySummary] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<any>(null)
  const [customerSearchForHistory, setCustomerSearchForHistory] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [audioEnabled, setAudioEnabled] = useState(true)

  const loadDailyStats = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/tpt/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDailyStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load daily stats:', error)
    }
  }

  const loadAudioDevices = useCallback(async () => {
    try {
      // Request microphone permission to access audio devices
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput')
      setAudioDevices(audioOutputs)
      if (audioOutputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioOutputs[0].deviceId)
      }
    } catch (error) {
      console.error('Failed to load audio devices:', error)
    }
  }, [selectedAudioDevice])

  const loadCustomLocation = () => {
    const saved = localStorage.getItem('tpt_custom_location')
    if (saved) {
      setCustomLocation(saved)
    }
  }

  const saveCustomLocation = (location: string) => {
    setCustomLocation(location)
    localStorage.setItem('tpt_custom_location', location)
  }

  const announceCustomer = async (queueNumber: string, customerName: string) => {
    if (!audioEnabled) return

    try {
      const utterance = new SpeechSynthesisUtterance()
      utterance.text = `Nomor antrian ${queueNumber}, ${customerName}, silakan menuju ${customLocation}.`
      utterance.lang = 'id-ID' // Indonesian language
      utterance.volume = 0.8
      utterance.rate = 0.9
      utterance.pitch = 1

      // Set audio output device if supported
      if ('setSinkId' in utterance && selectedAudioDevice) {
        try {
          await (utterance as any).setSinkId(selectedAudioDevice)
        } catch (error) {
          console.warn('Audio output device selection not supported:', error)
        }
      }

      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Failed to announce customer:', error)
    }
  }

  const recallCustomer = async () => {
    if (currentQueue) {
      await updateQueueStatus(currentQueue.id, 'CALLED')
      announceCustomer(currentQueue.queueNumber, currentQueue.customer.name)
    }
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    } else if (user) {
      fetchQueues()
      loadDailyStats()
      loadAudioDevices()
      loadCustomLocation()

      // Auto-refresh queues every 5 seconds
      const queueRefreshInterval = setInterval(() => {
        fetchQueues()
      }, 5000)

      // Check for break reminders every minute
      const breakCheckInterval = setInterval(() => {
        const now = new Date()
        const hour = now.getHours()
        const minute = now.getMinutes()

        // Lunch break reminder (12:00)
        if (hour === 12 && minute === 0) {
          setShowBreakReminder(true)
        }
        // Afternoon break reminder (15:00)
        else if (hour === 15 && minute === 0) {
          setShowBreakReminder(true)
        }
        // End of day reminder (16:30)
        else if (hour === 16 && minute === 30) {
          setShowEndOfDaySummary(true)
        }
      }, 60000) // Check every minute

      return () => {
        clearInterval(queueRefreshInterval)
        clearInterval(breakCheckInterval)
      }
    }
  }, [user, isLoading, router, loadAudioDevices])

  // Clear localStorage when user logs out
  useEffect(() => {
    if (!user && !isLoading) {
      localStorage.removeItem('tpt_service_completed')
      localStorage.removeItem('tpt_current_queue')
      localStorage.removeItem('tpt_service_notes')
      localStorage.removeItem('tpt_internal_notes')
      localStorage.removeItem('tpt_service_category')
      localStorage.removeItem('tpt_priority_level')
      localStorage.removeItem('tpt_service_start_time')
    }
  }, [user, isLoading])

  // Close customer search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.customer-search-container')) {
        setShowCustomerSearch(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchQueues = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/queues/tpt', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setQueues(data.queues)
      }
    } catch (error) {
      console.error('Failed to fetch queues:', error)
    }
  }

  const callNextCustomer = () => {
    // Check if there's already a current customer and service is not completed
    if (currentQueue && !serviceCompleted) {
      alert('Harap klik tombol "Selesai" terlebih dahulu sebelum memanggil pelanggan berikutnya.')
      return
    }

    const nextQueue = queues.find(q => q.status === 'WAITING')
    if (nextQueue) {
      setCurrentQueue(nextQueue)
      setServiceCompleted(false)
      localStorage.setItem('tpt_service_completed', 'false')
      setServiceStartTime(new Date())
      setServiceCategory('')
      setPriorityLevel('NORMAL')
      setServiceNotes('')
      setInternalNotes('')
      updateQueueStatus(nextQueue.id, 'IN_PROGRESS')
      fetchCustomerHistory(nextQueue.customer.id)
      setActiveTab('service') // Switch to service tab

      // Announce the customer
      announceCustomer(nextQueue.queueNumber, nextQueue.customer.name)
    }
  }

  const completeService = async () => {
    if (!currentQueue || !serviceStartTime) return

    // Calculate service duration in minutes
    const duration = Math.round((new Date().getTime() - serviceStartTime.getTime()) / (1000 * 60))

    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/queues/${currentQueue.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: serviceNotes,
          internalNotes: internalNotes,
          serviceCategory: serviceCategory,
          priorityLevel: priorityLevel,
          serviceDuration: duration
        })
      })

      if (response.ok) {
        const data = await response.json()
        setServiceCompleted(true)
        // Store the completed queue and completion status in localStorage for feedback page sync
        localStorage.setItem('tpt_current_queue', JSON.stringify(currentQueue))
        localStorage.setItem('tpt_service_completed', 'true')
        setServiceStartTime(null)
        setServiceNotes('')
        setInternalNotes('')
        setServiceCategory('')
        setPriorityLevel('NORMAL')
        setCurrentQueue(null) // Clear current customer to close the form and prevent double input
        fetchQueues()
        loadDailyStats()
      }
    } catch (error) {
      console.error('Failed to complete service:', error)
    } finally {
      setLoading(false)
    }
  }

  const escalateService = async (reason: string) => {
    if (!currentQueue) return

    try {
      const token = localStorage.getItem('auth_token')
      // Escalate to kepala-seksi instead of just marking as escalated
      const response = await fetch('/api/dashboard/tpt/escalate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          queueId: currentQueue.id,
          reason: reason
        })
      })

      if (response.ok) {
        setCurrentQueue(null)
        setServiceStartTime(null)
        fetchQueues()
      } else {
        console.error('Failed to escalate to kepala-seksi')
      }
    } catch (error) {
      console.error('Failed to escalate service:', error)
    }
  }

  const filteredHistory = customerHistory.filter(service => {
    const matchesSearch = historySearch === '' ||
      service.queueNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
      service.customer.name.toLowerCase().includes(historySearch.toLowerCase()) ||
      service.notes?.toLowerCase().includes(historySearch.toLowerCase())

    const matchesFilter = historyFilter === 'all' ||
      (historyFilter === 'high-rating' && (service.rating || 0) >= 4) ||
      (historyFilter === 'low-rating' && (service.rating || 0) <= 2) ||
      (historyFilter === 'escalated' && service.status === 'ESCALATED') ||
      (historyFilter === 'urgent' && service.priorityLevel === 'URGENT')

    return matchesSearch && matchesFilter
  })

  const fetchCustomerHistory = async (customerId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch(`/api/customers/${customerId}/service-history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomerHistory(data.serviceHistory || [])
      }
    } catch (error) {
      console.error('Failed to fetch customer history:', error)
    }
  }

  const searchCustomersForHistory = async (query: string) => {
    if (query.length < 3) {
      setCustomerSearchResults([])
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/customers?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomerSearchResults(data.customers || [])
      }
    } catch (error) {
      console.error('Failed to search customers:', error)
    }
  }

  const selectCustomerForHistory = async (customer: any) => {
    setSelectedCustomerForHistory(customer)
    setCustomerSearchForHistory('')
    setCustomerSearchResults([])
    setShowCustomerSearch(false)
    await fetchCustomerHistory(customer.id)
  }

  const updateQueueStatus = async (queueId: string, status: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      // Determine counter location to send
      // Use customLocation state if available
      const counterToSend = customLocation || 'Loket TPT' 
      
      await fetch(`/api/queues/${queueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status,
          counter: counterToSend
        })
      })
    } catch (error) {
      console.error('Failed to update queue status:', error)
    }
  }

  const forceCompleteQueue = async (queueId: string) => {
    if (!confirm('Apakah Anda yakin ingin menandai antrian ini sebagai selesai?')) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/queues/${queueId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: 'Pelayanan teknis diselesaikan secara manual',
          internalNotes: 'Antrian yang terlewat penyelesaiannya',
          serviceCategory: 'OTHER',
          serviceDuration: 0
        })
      })

      if (response.ok) {
        fetchQueues()
        loadDailyStats()
        alert('Antrian berhasil ditandai sebagai selesai')
      } else {
        alert('Gagal menandai antrian sebagai selesai')
      }
    } catch (error) {
      console.error('Failed to force complete queue:', error)
      alert('Terjadi kesalahan saat menyelesaikan antrian')
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard TPT - Tempat Pelayanan Terpadu</h1>
            <UserAvatar feedbackUrl="/feedback/tpt" />
          </div>

          {/* Daily Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pelayanan Hari Ini
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {dailyStats.servicesCompleted}
                  </dd>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">⭐</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Rating Rata-rata
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {dailyStats.averageRating.toFixed(1)}/5
                  </dd>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">⏱️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Durasi Rata-rata
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {Math.round(dailyStats.averageDuration)}m
                  </dd>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Waktu
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {Math.round(dailyStats.totalDuration / 60)}h
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'service', name: 'Pelayanan Teknis Pajak', icon: '🔧' },
                { id: 'history', name: 'Riwayat Pelayanan', icon: '📋' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'service' && (
            <div className="space-y-6">
              {/* Audio Controls */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Pengaturan Audio</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aktifkan Pengumuman Audio
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={audioEnabled}
                        onChange={(e) => setAudioEnabled(e.target.checked)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {audioEnabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Perangkat Output Audio
                    </label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    >
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi Kustom untuk Pengumuman
                    </label>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => saveCustomLocation(e.target.value)}
                      placeholder="Contoh: loket 1, counter A, meja teknis"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lokasi ini akan disebutkan dalam pengumuman suara
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={loadAudioDevices}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 text-sm"
                  >
                    Refresh Perangkat Audio
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Customer */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Wajib Pajak Saat Ini</h2>
                {currentQueue ? (
                  <div>
                    <div className="text-4xl font-bold text-center text-purple-600 mb-4">
                      {currentQueue.queueNumber}
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="font-medium">Nama:</span>
                        <span>{currentQueue.customer.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">NPWP:</span>
                        <span>{currentQueue.customer.npwp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Waktu Masuk:</span>
                        <span>{new Date(currentQueue.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Service Configuration */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kategori Pelayanan
                        </label>
                        <select
                          value={serviceCategory}
                          onChange={(e) => setServiceCategory(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        >
                          <option value="">Pilih Kategori</option>
                          <option value="E_FILING">E-Filing</option>
                          <option value="E_BILLING">E-Billing</option>
                          <option value="SPT_GUIDANCE">Panduan SPT</option>
                          <option value="SYSTEM_ACCESS">Akses Sistem</option>
                          <option value="DOCUMENT_UPLOAD">Upload Dokumen</option>
                          <option value="PAYMENT_ISSUES">Masalah Pembayaran</option>
                          <option value="REGISTRATION">Pendaftaran</option>
                          <option value="VERIFICATION">Verifikasi</option>
                          <option value="OTHER">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tingkat Prioritas
                        </label>
                        <select
                          value={priorityLevel}
                          onChange={(e) => setPriorityLevel(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        >
                          <option value="NORMAL">Normal</option>
                          <option value="HIGH">Tinggi</option>
                          <option value="URGENT">Mendesak</option>
                        </select>
                      </div>
                    </div>

                    {/* Service Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Pelayanan
                      </label>
                      <textarea
                        value={serviceNotes}
                        onChange={(e) => setServiceNotes(e.target.value)}
                        placeholder="Catat detail pelayanan teknis, masalah yang ditemukan, solusi yang diterapkan, dan bantuan yang diberikan..."
                        rows={4}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>

                    {/* Internal Notes */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Internal (untuk teknisi lain)
                      </label>
                      <textarea
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="Catatan internal yang tidak terlihat oleh wajib pajak..."
                        rows={2}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={completeService}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Menyimpan...' : 'Selesai Pelayanan Teknis'}
                      </button>
                      <button
                        onClick={recallCustomer}
                        disabled={!currentQueue}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🔊 Panggil Ulang
                      </button>
                      <button
                        onClick={() => escalateService('Masalah kompleks memerlukan supervisor')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Eskalasi ke Supervisor
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-6xl mb-4">👤</div>
                    <p>Tidak ada wajib pajak yang sedang dilayani</p>
                    <p className="text-sm mt-2">Klik &quot;Panggil Wajib Pajak Berikutnya&quot; untuk memulai</p>
                  </div>
                )}
              </div>

              {/* Queue List */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Antrian Wajib Pajak Menunggu</h2>
                
                {/* Stuck In-Progress Queues */}
                {queues.filter(q => q.status === 'IN_PROGRESS' && (!currentQueue || q.id !== currentQueue.id)).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-orange-600">⚠️ Antrian Yang Belum Diselesaikan</h3>
                    <div className="space-y-2">
                      {queues.filter(q => q.status === 'IN_PROGRESS' && (!currentQueue || q.id !== currentQueue.id)).map((queue) => (
                        <div key={queue.id} className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded">
                          <div>
                            <div className="font-semibold text-orange-800">{queue.queueNumber}</div>
                            <div className="text-sm text-gray-600">{queue.customer.name}</div>
                            <div className="text-xs text-orange-600">Status: Sedang Dilayani</div>
                          </div>
                          <button
                            onClick={() => forceCompleteQueue(queue.id)}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                          >
                            Tandai Selesai
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-6">
                  {queues.filter(q => q.status === 'WAITING').map((queue, index) => {
                    const waitingQueues = queues.filter(q => q.status === 'WAITING')
                    const showTimer = waitingQueues.length > 1 // Show timer for all waiting customers when there are 2+ in queue
                    
                    return (
                      <div key={queue.id} className={`flex justify-between items-center p-3 rounded ${
                        queue.priorityLevel === 'URGENT' ? 'bg-red-50 border border-red-200' :
                        queue.priorityLevel === 'HIGH' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-gray-50'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-semibold">{queue.queueNumber}</div>
                            <div className="text-sm text-gray-600">{queue.customer.name}</div>
                          </div>
                          {queue.priorityLevel !== 'NORMAL' && (
                            <span className={`px-2 py-1 text-xs rounded ${
                              queue.priorityLevel === 'URGENT' ? 'bg-red-100 text-red-800' :
                              queue.priorityLevel === 'HIGH' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {queue.priorityLevel === 'URGENT' ? 'MENDESAK' :
                               queue.priorityLevel === 'HIGH' ? 'TINGGI' : 'NORMAL'}
                            </span>
                          )}
                          {showTimer && (
                            <QueueTimer
                              queueStartTime={queue.createdAt}
                              isActive={true}
                              onAlarm={() => {
                                // Optional: Add additional alarm handling here
                                console.log(`Timer alarm for queue ${queue.queueNumber}`)
                              }}
                            />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(queue.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    )
                  })}
                  {queues.filter(q => q.status === 'WAITING').length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      Tidak ada antrian wajib pajak menunggu
                    </div>
                  )}
                </div>
                <button
                  onClick={callNextCustomer}
                  disabled={!queues.some(q => q.status === 'WAITING') || (currentQueue !== null && !serviceCompleted)}
                  className={`w-full py-3 px-4 rounded ${
                    !queues.some(q => q.status === 'WAITING') || (currentQueue !== null && !serviceCompleted)
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  Panggil Wajib Pajak Berikutnya
                </button>

                {currentQueue && !serviceCompleted && (
                  <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Harap klik tombol &quot;Selesai Pelayanan Teknis&quot; terlebih dahulu sebelum memanggil wajib pajak berikutnya
                  </div>
                )}

                {currentQueue && serviceCompleted && (
                  <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    ✅ Pelayanan teknis selesai. Siap memanggil wajib pajak berikutnya
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {activeTab === 'history' && (
            <ServiceHistory serviceType="TPT" />
          )}
        </div>
      </div>

      {/* Break Reminder Modal */}
      {showBreakReminder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">☕</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Waktunya Istirahat!</h3>
                  <p className="text-sm text-gray-600">Saatnya rehat sejenak untuk menjaga produktivitas</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBreakReminder(false)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Baik, saya istirahat dulu
                </button>
                <button
                  onClick={() => setShowBreakReminder(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Nanti saja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End of Day Summary Modal */}
      {showEndOfDaySummary && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Ringkasan Hari Ini</h3>
                  <p className="text-sm text-gray-600">Performa pelayanan hari ini</p>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span>Pelayanan Selesai:</span>
                  <span className="font-semibold">{dailyStats.servicesCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rating Rata-rata:</span>
                  <span className="font-semibold">{dailyStats.averageRating.toFixed(1)}/5 ⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>Durasi Rata-rata:</span>
                  <span className="font-semibold">{Math.round(dailyStats.averageDuration)} menit</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEndOfDaySummary(false)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                >
                  Selesai untuk hari ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}