'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'

interface Customer {
  id: string
  npwp: string
  name: string
  interests: string
  phone?: string
  email?: string
}

interface QueueStats {
  helpdesk: { waiting: number; inProgress: number; completed: number }
  tpt: { waiting: number; inProgress: number; completed: number }
  totalToday: number
  avgWaitTime: number
}

interface PublicQueue {
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

interface PublicQueueStats {
  totalWaiting: number
  totalInProgress: number
  totalCompleted: number
  helpdeskWaiting: number
  tptWaiting: number
  helpdeskInProgress: number
  tptInProgress: number
}

function PublicQueueDisplay() {
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

  useEffect(() => {
    fetchData()
    // Auto-refresh every 10 seconds for more real-time updates
    const interval = setInterval(fetchData, 10000)
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
    }
  }, [])

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching queue data...')
      setError(null)
      setConnectionStatus('checking')

      // Fetch current queues with cache-busting parameter
      const queuesResponse = await fetch(`/api/public/queues?t=${Date.now()}`)

      if (!queuesResponse.ok) {
        throw new Error(`API responded with status: ${queuesResponse.status} ${queuesResponse.statusText}`)
      }

      const queuesData = await queuesResponse.json()
      console.log('📊 Received data:', queuesData)

      if (queuesData.error) {
        throw new Error(queuesData.error)
      }

      setQueues(queuesData.queues || [])
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
      console.log('✅ Data updated successfully')
    } catch (error) {
      console.error('❌ Failed to fetch data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to load queue data: ${errorMessage}`)
      setConnectionStatus('disconnected')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat tampilan publik...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">KPP</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Tampilan Publik Antrian</h2>
              <p className="text-blue-100">Kantor Pelayanan Pajak Madya Dua Surabaya</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-lg mb-1">
                {currentTime.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-3xl font-bold">
                {currentTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
            <button
              onClick={toggleFullscreen}
              className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3l-6 6m0 0V4m0 5h5M3 21l6-6m0 0v5m0-5H4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Connection Status and Refresh */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Live' :
                 connectionStatus === 'disconnected' ? 'Offline' : 'Connecting...'}
              </span>
            </div>
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Update: {lastUpdate.toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>
          <button
            onClick={fetchData}
            disabled={connectionStatus === 'checking'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-600 mr-2">⚠️</div>
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Statistics Overview */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Status Antrian Hari Ini</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.totalWaiting}</div>
              <div className="text-sm text-yellow-800">Menunggu</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalInProgress}</div>
              <div className="text-sm text-blue-800">Sedang Dilayani</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalCompleted}</div>
              <div className="text-sm text-green-800">Selesai</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-1">{stats.helpdeskWaiting + stats.tptWaiting}</div>
              <div className="text-sm text-purple-800">Total Antrian</div>
            </div>
          </div>
        </div>

        {/* Current Queues */}
        <div className="space-y-6">
          {/* Helpdesk Queues */}
          <div>
            <h3 className="text-lg font-semibold text-blue-600 mb-3">Helpdesk</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {queues.filter(q => q.serviceType === 'HELPDESK').length > 0 ? (
                queues.filter(q => q.serviceType === 'HELPDESK').map((queue) => (
                  <div key={queue.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-4">
                      <div className="text-xl font-bold text-blue-900 min-w-0">
                        {queue.queueNumber}
                      </div>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">{queue.customerName}</div>
                        <div className="text-sm text-gray-600">{queue.customerNpwp}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
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
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  <p className="text-lg">Tidak ada antrian Helpdesk saat ini</p>
                </div>
              )}
            </div>
          </div>

          {/* TPT Queues */}
          <div>
            <h3 className="text-lg font-semibold text-purple-600 mb-3">TPT (Tempat Pelayanan Terpadu)</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {queues.filter(q => q.serviceType === 'TPT').length > 0 ? (
                queues.filter(q => q.serviceType === 'TPT').map((queue) => (
                  <div key={queue.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-4">
                      <div className="text-xl font-bold text-purple-900 min-w-0">
                        {queue.queueNumber}
                      </div>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">{queue.customerName}</div>
                        <div className="text-sm text-gray-600">{queue.customerNpwp}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
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
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  <p className="text-lg">Tidak ada antrian TPT saat ini</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReceptionistDashboard() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'register' | 'search' | 'queues' | 'manage' | 'public'>('register')
  const [customerData, setCustomerData] = useState({
    npwp: '',
    name: '',
    interests: '',
    phone: '',
    email: '',
    serviceType: 'HELPDESK' as 'HELPDESK' | 'TPT' | 'BOTH',
    serviceOrder: 'HELPDESK_FIRST' as 'HELPDESK_FIRST' | 'TPT_FIRST'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [queueStats, setQueueStats] = useState<QueueStats>({
    helpdesk: { waiting: 0, inProgress: 0, completed: 0 },
    tpt: { waiting: 0, inProgress: 0, completed: 0 },
    totalToday: 0,
    avgWaitTime: 0
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [customerHistory, setCustomerHistory] = useState<any[]>([])
  const [showCustomerHistory, setShowCustomerHistory] = useState(false)
  const [hasActiveQueue, setHasActiveQueue] = useState(false)
  const [npwpCheckTimeout, setNpwpCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const [managedQueues, setManagedQueues] = useState<any[]>([])
  const [managingQueue, setManagingQueue] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const startAutoRefresh = useCallback(() => {
    if (refreshInterval) return // Already running

    const interval = setInterval(() => {
      if (activeTab === 'manage') {
        loadManagedQueues()
        fetchQueueStats()
      }
    }, 10000) // Refresh every 10 seconds

    setRefreshInterval(interval)
  }, [refreshInterval]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopAutoRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }, [refreshInterval])

  const fetchQueueStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/receptionist/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setQueueStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    } else if (user) {
      fetchQueueStats()
      if (activeTab === 'manage') {
        loadManagedQueues()
        // Start auto-refresh when on manage tab
        startAutoRefresh()
      } else {
        stopAutoRefresh()
      }
    }

    return () => {
      stopAutoRefresh()
    }
  }, [user, isLoading, router, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const validateNPWP = (npwp: string) => {
    const cleanNpwp = npwp.replace(/[\.\-]/g, '')
    return /^\d{15}$/.test(cleanNpwp)
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    // NPWP validation
    if (!customerData.npwp.trim()) {
      errors.npwp = 'NPWP wajib diisi'
    } else if (!validateNPWP(customerData.npwp)) {
      errors.npwp = 'NPWP harus terdiri dari 15 digit angka'
    }

    // Name validation
    if (!customerData.name.trim()) {
      errors.name = 'Nama lengkap wajib diisi'
    }

    // Service type validation
    if (!customerData.serviceType) {
      errors.serviceType = 'Jenis layanan wajib dipilih'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const formatNPWP = (value: string) => {
    // Format NPWP as XX.XXX.XXX.X-XXX.XXX
    const clean = value.replace(/[^\d]/g, '')
    // Limit to 15 digits
    const limited = clean.substring(0, 15)
    if (limited.length <= 15) {
      return limited
        .replace(/^(\d{2})(\d{3})(\d{3})(\d{1})(\d{3})(\d{3})$/, '$1.$2.$3.$4-$5.$6')
        .substring(0, 20) // Limit to formatted length
    }
    return value
  }

  const checkExistingCustomer = async (npwp: string) => {
    if (!npwp || npwp.length < 15) return

    try {
      const token = localStorage.getItem('auth_token')
      const cleanNpwp = npwp.replace(/[\.\-]/g, '')
      const response = await fetch(`/api/customers?q=${cleanNpwp}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const customers = data.customers.filter((c: Customer) => c.npwp === cleanNpwp)

        if (customers.length > 0) {
          const customer = customers[0]
          setExistingCustomer(customer)

          // Auto-fill form with existing customer data
          setCustomerData(prev => ({
            ...prev,
            name: customer.name,
            interests: customer.interests || '',
            phone: customer.phone || '',
            email: customer.email || ''
          }))

          // Load customer history and check active queues
          const customerDetailsResponse = await fetch(`/api/customers/${customer.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (customerDetailsResponse.ok) {
            const customerDetails = await customerDetailsResponse.json()
            setCustomerHistory(customerDetails.serviceHistory || [])
            setHasActiveQueue(customerDetails.activeQueues && customerDetails.activeQueues.length > 0)
          }
        } else {
          setExistingCustomer(null)
          setCustomerHistory([])
          setHasActiveQueue(false)
        }
      }
    } catch (error) {
      console.error('Failed to check existing customer:', error)
    }
  }

  const loadCustomerHistory = async (customerId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomerHistory(data.serviceHistory || [])
      }
    } catch (error) {
      console.error('Failed to load customer history:', error)
    }
  }

  const loadManagedQueues = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/queues/manage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setManagedQueues(data.queues)
      }
    } catch (error) {
      console.error('Failed to load managed queues:', error)
    }
  }

  const manageQueue = async (queueId: string, action: string, params?: any) => {
    setManagingQueue(queueId)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/queues/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          queueId,
          action,
          ...params
        })
      })

      if (response.ok) {
        await loadManagedQueues()
        await fetchQueueStats()
        setMessage(`Antrian berhasil ${action === 'cancel' ? 'dibatalkan' : action === 'reassign' ? 'dipindahkan' : 'diubah prioritasnya'}`)
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        setMessage(`Error: ${error.error}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to manage queue:', error)
      setMessage('Gagal mengelola antrian')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setManagingQueue(null)
    }
  }

  const handleNpwpChange = (value: string) => {
    const formatted = formatNPWP(value)
    setCustomerData(prev => ({ ...prev, npwp: formatted }))

    // Clear existing customer data when NPWP changes
    if (formatted !== value) {
      setExistingCustomer(null)
      setCustomerHistory([])
      setHasActiveQueue(false)
    }

    // Debounce NPWP check
    if (npwpCheckTimeout) {
      clearTimeout(npwpCheckTimeout)
    }

    const timeout = setTimeout(() => {
      if (formatted.replace(/[\.\-]/g, '').length === 15) {
        checkExistingCustomer(formatted)
      }
    }, 500)

    setNpwpCheckTimeout(timeout)
  }

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setValidationErrors({})

    // Client-side validation
    if (!validateForm()) {
      return
    }

    // Check if customer has active queue
    if (hasActiveQueue) {
      setMessage('Wajib pajak ini sudah memiliki antrian aktif. Tidak dapat membuat antrian baru.')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customerData),
      })

      if (response.ok) {
        const result = await response.json()
        const queue = result.queue || result
        const serviceTypeDisplay = customerData.serviceType === 'BOTH' 
          ? ` (${queue.serviceType === 'HELPDESK' ? 'Helpdesk' : 'TPT'} pertama - akan dilanjutkan ke layanan berikutnya)`
          : ''
        setMessage(`Berhasil! Nomor antrian: ${queue.queueNumber || result.queueNumber}${serviceTypeDisplay}`)
        setCustomerData({
          npwp: '',
          name: '',
          interests: '',
          phone: '',
          email: '',
          serviceType: 'HELPDESK',
          serviceOrder: 'HELPDESK_FIRST'
        })
        setExistingCustomer(null)
        setCustomerHistory([])
        setHasActiveQueue(false)
        fetchQueueStats()
      } else {
        const error = await response.json()
        setMessage(error.error || 'Gagal membuat antrian')
      }
    } catch (error) {
      setMessage('Terjadi kesalahan saat membuat antrian')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/customers?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.customers)
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const selectCustomer = (customer: Customer) => {
    setCustomerData({
      ...customerData,
      npwp: customer.npwp,
      name: customer.name,
      interests: customer.interests,
      phone: customer.phone || '',
      email: customer.email || ''
    })
    setActiveTab('register')
    setSearchResults([])
    setSearchQuery('')
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
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Resepsionis</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Selamat datang, {user.name}
              </div>
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

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Hari Ini</dt>
                      <dd className="text-lg font-medium text-gray-900">{queueStats.totalToday}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Waktu Tunggu Rata-rata</dt>
                      <dd className="text-lg font-medium text-gray-900">{queueStats.avgWaitTime} menit</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Helpdesk Menunggu</dt>
                      <dd className="text-lg font-medium text-gray-900">{queueStats.helpdesk.waiting}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">TPT Menunggu</dt>
                      <dd className="text-lg font-medium text-gray-900">{queueStats.tpt.waiting}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'register', name: 'Daftar Antrian', icon: '👤' },
                { id: 'search', name: 'Cari Wajib Pajak', icon: '🔍' },
                { id: 'queues', name: 'Status Antrian', icon: '📊' },
                { id: 'manage', name: 'Kelola Antrian', icon: '⚙️' },
                { id: 'public', name: 'Tampilan Publik', icon: '📺' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
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
          {activeTab === 'register' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Pendaftaran Antrian Baru</h2>

              {message && (
                <div className={`mb-4 p-4 rounded-md ${message.includes('Berhasil') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="npwp" className="block text-sm font-medium text-gray-700">
                      NPWP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="npwp"
                      required
                      maxLength={20}
                      placeholder="XX.XXX.XXX.X-XXX.XXX"
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm focus:ring-green-500 focus:border-green-500 ${
                        validationErrors.npwp ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                      }`}
                      value={customerData.npwp}
                      onChange={(e) => {
                        handleNpwpChange(e.target.value)
                        // Clear validation error when user starts typing
                        if (validationErrors.npwp) {
                          setValidationErrors({...validationErrors, npwp: ''})
                        }
                      }}
                    />
                    {validationErrors.npwp && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.npwp}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Format: 15 digit angka</p>

                    {/* Existing Customer Indicator */}
                    {existingCustomer && (
                      <div className={`mt-2 p-3 border rounded-md ${hasActiveQueue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className={`h-5 w-5 ${hasActiveQueue ? 'text-red-400' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d={hasActiveQueue ? "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" : "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"} clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <p className={`text-sm font-medium ${hasActiveQueue ? 'text-red-800' : 'text-blue-800'}`}>
                              {hasActiveQueue ? 'Wajib Pajak Memiliki Antrian Aktif' : 'Wajib Pajak Ditemukan'}
                            </p>
                            <p className={`text-sm ${hasActiveQueue ? 'text-red-700' : 'text-blue-700'}`}>
                              {existingCustomer.name} • {customerHistory.length} kunjungan sebelumnya
                            </p>
                            {hasActiveQueue && (
                              <p className="text-sm text-red-600 mt-1">
                                ⚠️ Wajib pajak ini sudah memiliki antrian aktif. Pastikan untuk melanjutkan antrian yang ada atau batalkan terlebih dahulu.
                              </p>
                            )}
                          </div>
                          {!hasActiveQueue && (
                            <button
                              type="button"
                              onClick={() => setShowCustomerHistory(!showCustomerHistory)}
                              className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              {showCustomerHistory ? 'Sembunyikan' : 'Lihat Riwayat'}
                            </button>
                          )}
                        </div>

                        {/* Customer History */}
                        {showCustomerHistory && customerHistory.length > 0 && !hasActiveQueue && (
                          <div className="mt-3 border-t border-blue-200 pt-3">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">Riwayat Kunjungan Terakhir</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {customerHistory.slice(0, 3).map((visit: any, index: number) => (
                                <div key={index} className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                                  <div className="font-medium">{visit.serviceCategory || 'Layanan Umum'}</div>
                                  <div className="text-blue-600">
                                    {new Date(visit.completedAt).toLocaleDateString('id-ID')} • 
                                    Durasi: {visit.serviceDuration || 0} menit
                                  </div>
                                  {visit.rating && (
                                    <div className="text-yellow-600">⭐ {visit.rating}/5</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm focus:ring-green-500 focus:border-green-500 ${
                        validationErrors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                      }`}
                      value={customerData.name}
                      onChange={(e) => {
                        setCustomerData({...customerData, name: e.target.value})
                        // Clear validation error when user starts typing
                        if (validationErrors.name) {
                          setValidationErrors({...validationErrors, name: ''})
                        }
                      }}
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="interests" className="block text-sm font-medium text-gray-700">
                    Kebutuhan/Keluhan
                  </label>
                  <textarea
                    id="interests"
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Jelaskan kebutuhan atau keluhan wajib pajak..."
                    value={customerData.interests}
                    onChange={(e) => setCustomerData({...customerData, interests: e.target.value})}
                  />
                </div>

                <div>
                  <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">
                    Jenis Layanan <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="serviceType"
                    disabled={loading || hasActiveQueue}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm focus:ring-green-500 focus:border-green-500 ${
                      validationErrors.serviceType ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                    }`}
                    value={customerData.serviceType}
                    onChange={(e) => {
                      setCustomerData({...customerData, serviceType: e.target.value as any})
                      // Clear validation error when user selects
                      if (validationErrors.serviceType) {
                        setValidationErrors({...validationErrors, serviceType: ''})
                      }
                    }}
                  >
                    <option value="HELPDESK">Helpdesk - Bantuan Teknis</option>
                    <option value="TPT">TPT - Teknisi Pelayanan Teknis</option>
                    <option value="BOTH">Keduanya - Helpdesk & TPT</option>
                  </select>
                  {validationErrors.serviceType && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.serviceType}</p>
                  )}
                </div>

                {customerData.serviceType === 'BOTH' && (
                  <div>
                    <label htmlFor="serviceOrder" className="block text-sm font-medium text-gray-700">
                      Urutan Layanan <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="serviceOrder"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      value={customerData.serviceOrder}
                      onChange={(e) => setCustomerData({...customerData, serviceOrder: e.target.value as any})}
                    >
                      <option value="HELPDESK_FIRST">Helpdesk dulu, kemudian TPT</option>
                      <option value="TPT_FIRST">TPT dulu, kemudian Helpdesk</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Sistem akan otomatis membuat antrian untuk layanan berikutnya setelah layanan pertama selesai.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || hasActiveQueue}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Memproses...' : hasActiveQueue ? 'Antrian Aktif Ditemukan' : 'Buat Nomor Antrian'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Pencarian Wajib Pajak</h2>

              <div className="mb-4">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Cari berdasarkan NPWP (15 digit) atau nama..."
                    maxLength={50}
                    className="flex-1 border-gray-300 rounded-l-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    value={searchQuery}
                    onChange={(e) => {
                      // Allow both letters and numbers for name/NPWP search
                      const value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50)
                      setSearchQuery(value)
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 bg-gray-50 rounded-r-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cari
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">Hasil Pencarian</h3>
                  {searchResults.map((customer) => (
                    <div key={customer.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{customer.name}</h4>
                          <p className="text-sm text-gray-500">NPWP: {customer.npwp}</p>
                          {customer.phone && <p className="text-sm text-gray-500">Telp: {customer.phone}</p>}
                          {customer.interests && <p className="text-sm text-gray-500">Kebutuhan: {customer.interests.substring(0, 50)}...</p>}
                        </div>
                        <button
                          onClick={() => selectCustomer(customer)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                        >
                          Pilih
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'queues' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Status Antrian Hari Ini</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Helpdesk Queue */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Helpdesk</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Menunggu:</span>
                        <span className="text-sm font-medium text-yellow-600">{queueStats.helpdesk.waiting}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Sedang Dilayani:</span>
                        <span className="text-sm font-medium text-blue-600">{queueStats.helpdesk.inProgress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Selesai:</span>
                        <span className="text-sm font-medium text-green-600">{queueStats.helpdesk.completed}</span>
                      </div>
                    </div>
                  </div>

                  {/* TPT Queue */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">TPT</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Menunggu:</span>
                        <span className="text-sm font-medium text-yellow-600">{queueStats.tpt.waiting}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Sedang Dilayani:</span>
                        <span className="text-sm font-medium text-blue-600">{queueStats.tpt.inProgress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Selesai:</span>
                        <span className="text-sm font-medium text-green-600">{queueStats.tpt.completed}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Kelola Antrian Aktif</h2>
                    <p className="text-sm text-gray-600">Hanya menampilkan antrian yang belum selesai (Menunggu/Dalam Proses)</p>
                    <p className="text-xs text-green-600">🔄 Auto-refresh aktif setiap 10 detik</p>
                  </div>
                  <button
                    onClick={() => {
                      loadManagedQueues()
                      fetchQueueStats()
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    🔄 Refresh Manual
                  </button>
                </div>

                {message && (
                  <div className={`mb-4 p-4 rounded-md ${message.includes('berhasil') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message}
                  </div>
                )}

                <div className="space-y-4">
                  {managedQueues.filter(queue => queue.status !== 'COMPLETED').length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-6xl mb-4">📋</div>
                      <p>Tidak ada antrian aktif untuk dikelola</p>
                      <p className="text-sm mt-2">Antrian yang sudah selesai tidak ditampilkan di sini</p>
                    </div>
                  ) : (
                    managedQueues.filter(queue => queue.status !== 'COMPLETED').map((queue) => (
                      <div key={queue.id} className={`border rounded-lg p-4 ${queue.status === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-bold text-gray-900">{queue.queueNumber}</div>
                            <div className={`px-2 py-1 text-xs rounded ${queue.priorityLevel === 'URGENT' ? 'bg-red-100 text-red-800' : queue.priorityLevel === 'HIGH' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                              {queue.priorityLevel === 'URGENT' ? 'MENDESAK' : queue.priorityLevel === 'HIGH' ? 'TINGGI' : 'NORMAL'}
                            </div>
                            <div className={`px-2 py-1 text-xs rounded ${queue.serviceType === 'HELPDESK' ? 'bg-green-100 text-green-800' : queue.serviceType === 'TPT' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {queue.serviceType}
                            </div>
                            <div className={`px-2 py-1 text-xs rounded ${queue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {queue.status === 'IN_PROGRESS' ? 'SEDANG DILAYANI' : 'MENUNGGU'}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(queue.createdAt).toLocaleString('id-ID')}
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="font-medium text-gray-900">{queue.customer.name}</div>
                          <div className="text-sm text-gray-600">NPWP: {queue.customer.npwp}</div>
                          {queue.customer.phone && <div className="text-sm text-gray-600">Telp: {queue.customer.phone}</div>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Cancel Queue */}
                          <button
                            onClick={() => manageQueue(queue.id, 'cancel')}
                            disabled={managingQueue === queue.id}
                            className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                          >
                            {managingQueue === queue.id ? '...' : '❌ Batalkan'}
                          </button>

                          {/* Change Priority */}
                          <select
                            onChange={(e) => {
                              if (e.target.value && e.target.value !== queue.priorityLevel) {
                                manageQueue(queue.id, 'change_priority', { newPriorityLevel: e.target.value })
                              }
                            }}
                            defaultValue=""
                            disabled={managingQueue === queue.id}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            <option value="">🔄 Ubah Prioritas</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">Tinggi</option>
                            <option value="URGENT">Mendesak</option>
                          </select>

                          {/* Reassign Service Type */}
                          <select
                            onChange={(e) => {
                              if (e.target.value && e.target.value !== queue.serviceType) {
                                manageQueue(queue.id, 'reassign', { newServiceType: e.target.value })
                              }
                            }}
                            defaultValue=""
                            disabled={managingQueue === queue.id}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            <option value="">🔄 Pindah Layanan</option>
                            <option value="HELPDESK">Helpdesk</option>
                            <option value="TPT">TPT</option>
                            <option value="BOTH">Both</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Public Display Tab */}
          {activeTab === 'public' && (
            <PublicQueueDisplay />
          )}
        </div>
      </div>
    </div>
  )
}
