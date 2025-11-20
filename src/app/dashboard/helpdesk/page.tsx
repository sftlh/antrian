'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'

interface Queue {
  id: string
  queueNumber: string
  customer: {
    id: string
    name: string
    npwp: string
  }
  status: string
  createdAt: string
  serviceCategory?: string
  notes?: string
  internalNotes?: string
  completedAt?: string
  serviceDuration?: number
  rating?: number
  feedback?: string
  priorityLevel?: string
}

interface ServiceTemplate {
  id: string
  title: string
  category: string
  content: string
}

export default function HelpdeskDashboard() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'service' | 'history' | 'statistics'>('service')
  const [queues, setQueues] = useState<Queue[]>([])
  const [currentQueue, setCurrentQueue] = useState<Queue | null>(null)
  const [serviceCompleted, setServiceCompleted] = useState(false)
  const [serviceNotes, setServiceNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')

  // Load persisted state from localStorage on mount
  useEffect(() => {
    const savedServiceCompleted = localStorage.getItem('helpdesk_service_completed')
    if (savedServiceCompleted === 'true') {
      setServiceCompleted(true)
    }

    const savedCurrentQueue = localStorage.getItem('helpdesk_current_queue')
    if (savedCurrentQueue) {
      try {
        setCurrentQueue(JSON.parse(savedCurrentQueue))
      } catch (error) {
        console.error('Failed to parse saved current queue:', error)
      }
    }

    const savedServiceNotes = localStorage.getItem('helpdesk_service_notes')
    if (savedServiceNotes) {
      setServiceNotes(savedServiceNotes)
    }

    const savedInternalNotes = localStorage.getItem('helpdesk_internal_notes')
    if (savedInternalNotes) {
      setInternalNotes(savedInternalNotes)
    }

    const savedServiceCategory = localStorage.getItem('helpdesk_service_category')
    if (savedServiceCategory) {
      setServiceCategory(savedServiceCategory)
    }
  }, [])

  // Save service completion state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('helpdesk_service_completed', serviceCompleted.toString())
  }, [serviceCompleted])

  useEffect(() => {
    if (currentQueue) {
      localStorage.setItem('helpdesk_current_queue', JSON.stringify(currentQueue))
    } else {
      localStorage.removeItem('helpdesk_current_queue')
    }
  }, [currentQueue])

  useEffect(() => {
    localStorage.setItem('helpdesk_service_notes', serviceNotes)
  }, [serviceNotes])

  useEffect(() => {
    localStorage.setItem('helpdesk_internal_notes', internalNotes)
  }, [internalNotes])

  useEffect(() => {
    localStorage.setItem('helpdesk_service_category', serviceCategory)
  }, [serviceCategory])

  const [customerHistory, setCustomerHistory] = useState<Queue[]>([])
  const [dailyStats, setDailyStats] = useState({
    servicesCompleted: 0,
    averageRating: 0,
    totalDuration: 0,
    averageDuration: 0
  })
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [customLocation, setCustomLocation] = useState<string>('loket bantuan umum')
  const [customerSearchForHistory, setCustomerSearchForHistory] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<any>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyFilter, setHistoryFilter] = useState('all')

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

      return () => clearInterval(queueRefreshInterval)
    }
  }, [user, isLoading, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear localStorage when user logs out
  useEffect(() => {
    if (!user && !isLoading) {
      localStorage.removeItem('helpdesk_service_completed')
      localStorage.removeItem('helpdesk_current_queue')
      localStorage.removeItem('helpdesk_service_notes')
      localStorage.removeItem('helpdesk_internal_notes')
      localStorage.removeItem('helpdesk_service_category')
    }
  }, [user, isLoading])

  // Validate serviceCategory whenever it changes
  useEffect(() => {
    const validCategories = [
      'HELPDESK', 'E_FILING', 'E_BILLING', 'SPT_GUIDANCE', 'SYSTEM_ACCESS',
      'DOCUMENT_UPLOAD', 'PAYMENT_ISSUES', 'REGISTRATION', 'VERIFICATION', 'OTHER'
    ]
    if (serviceCategory && !validCategories.includes(serviceCategory)) {
      setServiceCategory('HELPDESK')
    }
  }, [serviceCategory])

  const fetchQueues = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/queues/helpdesk', {
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

  const loadDailyStats = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/helpdesk/stats', {
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
    const saved = localStorage.getItem('helpdesk_custom_location')
    if (saved) {
      setCustomLocation(saved)
    }
  }

  const saveCustomLocation = (location: string) => {
    setCustomLocation(location)
    localStorage.setItem('helpdesk_custom_location', location)
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

  const fetchCustomerHistory = async (customerId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
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

  const announceCustomer = async (queueNumber: string, customerName: string, customText?: string) => {
    if (!audioEnabled) return

    try {
      const utterance = new SpeechSynthesisUtterance()
      utterance.text = customText || `Nomor antrian ${queueNumber}, ${customerName}, silakan menuju ${customLocation}.`
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

  const callNextCustomer = () => {
    // Check if there's already a current customer and service is not completed
    if (currentQueue && !serviceCompleted) {
      alert('Harap klik tombol "Selesai" terlebih dahulu sebelum memanggil pelanggan berikutnya.')
      return
    }

    // Prioritize escalated queues over regular waiting queues
    const escalatedQueue = queues.find(q => q.status === 'ESCALATED')
    const nextQueue = escalatedQueue || queues.find(q => q.status === 'WAITING')

    if (nextQueue) {
      setCurrentQueue(nextQueue)
      setServiceCompleted(false)
      localStorage.setItem('helpdesk_service_completed', 'false')
      setServiceNotes('')
      setInternalNotes('')
      setServiceCategory('')

      // If it's an escalated queue, mark it as in progress
      // If it's a regular queue, call it first then mark as in progress
      const newStatus = nextQueue.status === 'ESCALATED' ? 'IN_PROGRESS' : 'IN_PROGRESS'
      updateQueueStatus(nextQueue.id, newStatus)

      // Announce the customer
      const announcementText = nextQueue.status === 'ESCALATED'
        ? `Pelanggan ${nextQueue.queueNumber}, ${nextQueue.customer.name}. Antrian prioritas dieskalasi.`
        : `Pelanggan ${nextQueue.queueNumber}, ${nextQueue.customer.name}.`
      announceCustomer(nextQueue.queueNumber, nextQueue.customer.name, announcementText)

      // Load customer history
      fetchCustomerHistory(nextQueue.customer.id)
    }
  }

  const completeService = async () => {
    if (!currentQueue) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/queues/helpdesk/${currentQueue.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: serviceNotes,
          internalNotes: internalNotes,
          serviceCategory: serviceCategory && [
            'HELPDESK', 'E_FILING', 'E_BILLING', 'SPT_GUIDANCE', 'SYSTEM_ACCESS',
            'DOCUMENT_UPLOAD', 'PAYMENT_ISSUES', 'REGISTRATION', 'VERIFICATION', 'OTHER'
          ].includes(serviceCategory) ? serviceCategory : 'HELPDESK'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setServiceCompleted(true)
        // Store the completed queue and completion status in localStorage for feedback page sync
        localStorage.setItem('helpdesk_current_queue', JSON.stringify(currentQueue))
        localStorage.setItem('helpdesk_service_completed', 'true')
        setCustomerHistory([])
        setCurrentQueue(null) // Clear current customer to hide the form
        setServiceNotes('') // Clear form fields
        setInternalNotes('')
        setServiceCategory('')
        fetchQueues()
        loadDailyStats()
      }
    } catch (error) {
      console.error('Failed to complete service:', error)
    }
  }



  const updateQueueStatus = async (queueId: string, status: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`/api/queues/${queueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
    } catch (error) {
      console.error('Failed to update queue status:', error)
    }
  }

  const forceCompleteQueue = async (queueId: string) => {
    if (!confirm('Apakah Anda yakin ingin menandai antrian ini sebagai selesai?')) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/queues/helpdesk/${queueId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: 'Layanan diselesaikan secara manual',
          internalNotes: 'Antrian yang terlewat penyelesaiannya',
          serviceCategory: 'OTHER'
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Helpdesk</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Selamat datang, {user.name}
              </div>
              <button
                onClick={() => window.open('/feedback/helpdesk', '_blank')}
                className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                💬 Feedback
              </button>
              <button
                onClick={() => {
                  logout()
                  router.push('/')
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Keluar
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('service')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'service'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏢 Layanan
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 Riwayat
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'statistics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Statistik
              </button>
            </nav>
          </div>

          {activeTab === 'service' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Customer */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Pelanggan Saat Ini</h2>
                {currentQueue ? (
                  <div>
                    <div className="text-4xl font-bold text-center text-blue-600 mb-4">
                      {currentQueue.queueNumber}
                    </div>
                    <div className="space-y-2 mb-4">
                      <p><strong>Nama:</strong> {currentQueue.customer.name}</p>
                      <p><strong>NPWP:</strong> {currentQueue.customer.npwp}</p>
                    </div>

                    {/* Service Category */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategori Bantuan
                      </label>
                      <select
                        value={serviceCategory}
                        onChange={(e) => setServiceCategory(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Pilih kategori...</option>
                        <option value="HELPDESK">Informasi Umum</option>
                        <option value="SPT_GUIDANCE">Panduan Formulir</option>
                        <option value="REGISTRATION">Persyaratan</option>
                        <option value="SYSTEM_ACCESS">Prosedur</option>
                        <option value="E_FILING">E-Filing</option>
                        <option value="E_BILLING">E-Billing</option>
                        <option value="PAYMENT_ISSUES">Masalah Pembayaran</option>
                        <option value="DOCUMENT_UPLOAD">Upload Dokumen</option>
                        <option value="VERIFICATION">Verifikasi</option>
                        <option value="OTHER">Lainnya</option>
                      </select>
                    </div>

                    {/* Service Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Layanan
                      </label>
                      <textarea
                        value={serviceNotes}
                        onChange={(e) => setServiceNotes(e.target.value)}
                        placeholder="Jelaskan bantuan yang diberikan..."
                        rows={4}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    {/* Internal Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Internal (Opsional)
                      </label>
                      <textarea
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="Catatan untuk petugas lain..."
                        rows={2}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => currentQueue && announceCustomer(currentQueue.queueNumber, currentQueue.customer.name)}
                        className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700"
                      >
                        📢 Panggil Ulang
                      </button>
                      <button
                        onClick={completeService}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                      >
                        ✅ Selesai
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-4">👤</div>
                    <p>Tidak ada pelanggan yang sedang dilayani</p>
                  </div>
                )}
              </div>

              {/* Queue List & Audio Controls */}
              <div className="space-y-6">
                {/* Audio Controls */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Pengaturan Audio</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="audio-enabled"
                        type="checkbox"
                        checked={audioEnabled}
                        onChange={(e) => setAudioEnabled(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="audio-enabled" className="ml-2 block text-sm text-gray-900">
                        Aktifkan pengumuman suara
                      </label>
                    </div>
                    {audioDevices.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Perangkat Output Audio
                        </label>
                        <select
                          value={selectedAudioDevice}
                          onChange={(e) => setSelectedAudioDevice(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {audioDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lokasi Kustom untuk Pengumuman
                      </label>
                      <input
                        type="text"
                        value={customLocation}
                        onChange={(e) => saveCustomLocation(e.target.value)}
                        placeholder="Contoh: loket 1, counter A, meja bantuan"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Lokasi ini akan disebutkan dalam pengumuman suara
                      </p>
                    </div>
                  </div>
                </div>

                {/* Queue List */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Antrian Menunggu</h2>
                  <div className="space-y-2 mb-4">
                    {queues.filter(q => q.status === 'WAITING').map((queue) => (
                      <div key={queue.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-semibold">{queue.queueNumber}</div>
                          <div className="text-sm text-gray-600">{queue.customer.name}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(queue.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stuck In-Progress Queues */}
                  {queues.filter(q => q.status === 'IN_PROGRESS' && (!currentQueue || q.id !== currentQueue.id)).length > 0 && (
                    <div className="mt-6">
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

                  <button
                    onClick={callNextCustomer}
                    disabled={currentQueue !== null && !serviceCompleted}
                    className={`w-full py-2 px-4 rounded mt-4 ${
                      currentQueue !== null && !serviceCompleted
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    📢 Panggil Pelanggan Selanjutnya
                  </button>

                  {currentQueue && !serviceCompleted && (
                    <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ Harap klik tombol &quot;Selesai&quot; terlebih dahulu sebelum memanggil pelanggan berikutnya
                    </div>
                  )}

                  {currentQueue && serviceCompleted && (
                    <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                      ✅ Layanan selesai. Siap memanggil pelanggan berikutnya
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Riwayat Pelayanan Wajib Pajak</h2>

                {/* Customer Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Wajib Pajak
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari berdasarkan NPWP atau nama..."
                      value={customerSearchForHistory}
                      onChange={(e) => {
                        setCustomerSearchForHistory(e.target.value)
                        searchCustomersForHistory(e.target.value)
                        setShowCustomerSearch(true)
                      }}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {showCustomerSearch && customerSearchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {customerSearchResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                            onClick={() => selectCustomerForHistory(customer)}
                          >
                            <div className="flex items-center">
                              <span className="font-medium">{customer.name}</span>
                              <span className="ml-2 text-gray-500">({customer.npwp})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCustomerForHistory && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-blue-900">{selectedCustomerForHistory.name}</p>
                          <p className="text-sm text-blue-700">NPWP: {selectedCustomerForHistory.npwp}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCustomerForHistory(null)
                            setCustomerHistory([])
                            setCustomerSearchForHistory('')
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Ganti Wajib Pajak
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedCustomerForHistory ? (
                  <div>
                    {filteredHistory.length > 0 ? (
                      <div className="space-y-4">
                        {filteredHistory.map((service) => (
                        <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium">{service.queueNumber}</span>
                            <span className={`px-2 py-1 text-xs rounded ${
                              service.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {service.status === 'COMPLETED' ? 'Selesai' : 'Dalam Proses'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {new Date(service.createdAt).toLocaleDateString()} {new Date(service.createdAt).toLocaleTimeString()}
                          </p>
                          {service.notes && (
                            <p className="text-sm text-gray-700 mb-2">{service.notes}</p>
                          )}
                          {service.serviceCategory && (
                            <p className="text-sm text-blue-600">Kategori: {service.serviceCategory}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-4xl mb-4">📋</div>
                      <p>Belum ada riwayat pelayanan untuk wajib pajak ini</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">👤</div>
                  <p>Pilih wajib pajak terlebih dahulu untuk melihat riwayat</p>
                </div>
              )}
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">Statistik Harian</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">✅</div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Pelayanan Selesai</p>
                        <p className="text-2xl font-bold text-blue-600">{dailyStats.servicesCompleted}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">⭐</div>
                      <div>
                        <p className="text-sm font-medium text-green-900">Rating Rata-rata</p>
                        <p className="text-2xl font-bold text-green-600">{dailyStats.averageRating.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">⏱️</div>
                      <div>
                        <p className="text-sm font-medium text-purple-900">Total Durasi</p>
                        <p className="text-2xl font-bold text-purple-600">{Math.round(dailyStats.totalDuration / 60)}m</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">📊</div>
                      <div>
                        <p className="text-sm font-medium text-orange-900">Rata-rata Durasi</p>
                        <p className="text-2xl font-bold text-orange-600">{Math.round(dailyStats.averageDuration)}m</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Ringkasan Kinerja</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Efisiensi</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {dailyStats.servicesCompleted > 0 ? 'Baik' : 'Belum ada data'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Kepuasan</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {dailyStats.averageRating >= 4 ? 'Sangat Baik' :
                           dailyStats.averageRating >= 3 ? 'Baik' :
                           dailyStats.averageRating > 0 ? 'Perlu Ditingkatkan' : 'Belum ada data'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target Harian</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {dailyStats.servicesCompleted}/20
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
