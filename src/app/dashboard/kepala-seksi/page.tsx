'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import ServiceHistory from '@/components/ServiceHistory'
import UserAvatar from '@/components/UserAvatar'
import QueueTimer from '@/components/QueueTimer'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

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
  rating: number | null
  feedback: string | null
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
  const [activeTab, setActiveTab] = useState<'monitoring' | 'rekap'>('monitoring')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [filteredStats, setFilteredStats] = useState<QueueStats | null>(null)
  const [filteredQueues, setFilteredQueues] = useState<QueueItem[]>([])
  const [isFiltering, setIsFiltering] = useState(false)
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

  // Pagination and filtering for Rekap Antrian Detail
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(15)
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL')
  const [complaintFilter, setComplaintFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')

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

  // Function to filter queues based on current filters
  const getFilteredQueues = () => {
    const baseQueues = filteredQueues.length > 0 ? filteredQueues : queues

    return baseQueues.filter(queue => {
      // Service type filter
      if (serviceTypeFilter !== 'ALL' && queue.serviceType !== serviceTypeFilter) {
        return false
      }

      // Complaint/Masalah filter
      if (complaintFilter !== 'ALL') {
        const notes = queue.notes || 'Konsultasi umum'
        const complaintType = getComplaintType(notes)
        if (complaintType !== complaintFilter) {
          return false
        }
      }

      // Search term filter (customer name)
      if (searchTerm && !queue.customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      return true
    })
  }

  // Helper function to categorize complaint types
  const getComplaintType = (notes: string) => {
    const lowerNotes = notes.toLowerCase()
    if (lowerNotes.includes('spt') || lowerNotes.includes('pajak') || lowerNotes.includes('pelaporan')) {
      return 'PELAPORAN_PAJAK'
    } else if (lowerNotes.includes('sistem') || lowerNotes.includes('login') || lowerNotes.includes('akses')) {
      return 'AKSES_SISTEM'
    } else if (lowerNotes.includes('pembayaran') || lowerNotes.includes('billing') || lowerNotes.includes('bayar')) {
      return 'PEMBAYARAN'
    } else if (lowerNotes.includes('registrasi') || lowerNotes.includes('daftar')) {
      return 'REGISTRASI'
    } else if (lowerNotes.includes('verifikasi') || lowerNotes.includes('validasi')) {
      return 'VERIFIKASI'
    } else if (lowerNotes.includes('dokumen') || lowerNotes.includes('upload')) {
      return 'DOKUMEN'
    } else {
      return 'LAINNYA'
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

  const exportDetailedQueueToExcel = () => {
    // Use filtered data if available, otherwise use current data
    const queuesToExport = filteredQueues.length > 0 ? filteredQueues : queues
    const dataToExport = filteredStats || stats

    // Prepare data for Excel export
    const currentDate = new Date().toLocaleDateString('id-ID')
    const currentTime = new Date().toLocaleTimeString('id-ID')

    // Header information
    const headerData = [
      ['REKAP ANTRIAN DETAIL - NAWAITU'],
      ['Tanggal Export', currentDate],
      ['Waktu Export', currentTime],
      ['Periode', dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : 'Semua Data'],
      ['Total Antrian', queuesToExport.length.toString()],
      ['']
    ]

    // Detail queue data with enhanced formatting
    const detailHeaders = [
      'No',
      'No Antrian',
      'Layanan',
      'Nama Customer',
      'NPWP',
      'No HP',
      'Prioritas',
      'Status',
      'Waktu Dibuat',
      'Waktu Dipanggil',
      'Waktu Mulai Pelayanan',
      'Waktu Tunggu',
      'Durasi Pelayanan',
      'Ditangani Oleh',
      'Rating',
      'Catatan',
      'Alasan Escalated'
    ]

    const detailData = [detailHeaders]

    queuesToExport.forEach((queue, index) => {
      const waitingTime = calculateWaitingTime(queue.createdAt, queue.status, queue.calledAt)
      const serviceDuration = queue.startedAt && queue.calledAt ?
        Math.round((new Date(queue.startedAt).getTime() - new Date(queue.calledAt).getTime()) / (1000 * 60)) + ' menit' :
        '-'

      // Get staff name if available
      let staffName = '-'
      if (queue.calledById) {
        const helpdeskStaff = dataToExport.staffPerformance.helpdesk.find(s => s.id === queue.calledById)
        const tptStaff = dataToExport.staffPerformance.tpt.find(s => s.id === queue.calledById)
        staffName = helpdeskStaff?.name || tptStaff?.name || 'Staff'
      }

      // Get rating if completed
      let rating = '-'
      if (queue.rating !== null && queue.rating !== undefined) {
        rating = queue.rating.toString()
      }

      detailData.push([
        (index + 1).toString(),
        queue.queueNumber,
        queue.serviceType === 'HELPDESK' ? 'Helpdesk' :
        queue.serviceType === 'TPT' ? 'TPT' : queue.serviceType,
        queue.customerName,
        queue.customerNpwp,
        queue.customerPhone || '-',
        queue.priorityLevel === 'NORMAL' ? 'Normal' :
        queue.priorityLevel === 'HIGH' ? 'Tinggi' : queue.priorityLevel,
        queue.status === 'WAITING' ? 'Menunggu' :
        queue.status === 'CALLED' ? 'Dipanggil' :
        queue.status === 'IN_PROGRESS' ? 'Dalam Proses' :
        queue.status === 'COMPLETED' ? 'Selesai' :
        queue.status === 'CANCELLED' ? 'Dibatalkan' :
        queue.status === 'ESCALATED' ? 'Escalated' : queue.status,
        new Date(queue.createdAt).toLocaleString('id-ID'),
        queue.calledAt ? new Date(queue.calledAt).toLocaleString('id-ID') : '-',
        queue.startedAt ? new Date(queue.startedAt).toLocaleString('id-ID') : '-',
        waitingTime,
        serviceDuration,
        staffName,
        rating,
        queue.notes || '-',
        queue.escalatedReason || '-'
      ])
    })

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()

    // Header sheet
    const wsHeader = XLSX.utils.aoa_to_sheet(headerData)
    XLSX.utils.book_append_sheet(wb, wsHeader, 'Info')

    // Detail sheet
    const wsDetail = XLSX.utils.aoa_to_sheet(detailData)

    // Set column widths for better readability
    const colWidths = [
      { wch: 5 },  // No
      { wch: 12 }, // No Antrian
      { wch: 10 }, // Layanan
      { wch: 25 }, // Nama Customer
      { wch: 20 }, // NPWP
      { wch: 15 }, // No HP
      { wch: 10 }, // Prioritas
      { wch: 15 }, // Status
      { wch: 18 }, // Waktu Dibuat
      { wch: 18 }, // Waktu Dipanggil
      { wch: 18 }, // Waktu Mulai Pelayanan
      { wch: 12 }, // Waktu Tunggu
      { wch: 15 }, // Durasi Pelayanan
      { wch: 20 }, // Ditangani Oleh
      { wch: 8 },  // Rating
      { wch: 30 }, // Catatan
      { wch: 25 }  // Alasan Escalated
    ]
    wsDetail['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Rekap Antrian Detail')

    // Generate filename with date range
    const dateSuffix = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : new Date().toISOString().split('T')[0]
    const filename = `Rekap_Antrian_Detail_Nawaitu_${dateSuffix}.xlsx`

    // Save file
    XLSX.writeFile(wb, filename)
  }

  const exportToExcel = () => {
    // Use filtered data if available, otherwise use current data
    const dataToExport = filteredStats || stats
    const queuesToExport = filteredQueues.length > 0 ? filteredQueues : queues

    // Prepare data for Excel export
    const currentDate = new Date().toLocaleDateString('id-ID')
    const currentTime = new Date().toLocaleTimeString('id-ID')

    // Summary data
    const summaryData = [
      ['REKAP PELAYANAN NAWAITU'],
      ['Tanggal Export', currentDate],
      ['Waktu Export', currentTime],
      ['Periode', dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : 'Semua Data'],
      [''],
      ['RINGKASAN PELAYANAN'],
      ['Kategori', 'Jumlah'],
      ['Total Pelayanan', dataToExport.total.completed.toString()],
      ['Helpdesk', dataToExport.helpdesk.completed.toString()],
      ['TPT', dataToExport.tpt.completed.toString()],
      ['Menunggu', dataToExport.total.waiting.toString()],
      ['Dalam Proses', dataToExport.total.inProgress.toString()],
      ['Escalated', dataToExport.total.escalated.toString()],
      ['Dibatalkan', dataToExport.total.cancelled.toString()],
      [''],
      ['PERFORMA STAFF'],
      ['Layanan', 'Staff', 'Pelayanan Hari Ini', 'Rating Rata-rata']
    ]

    // Add staff performance data
    dataToExport.staffPerformance.helpdesk.forEach(staff => {
      summaryData.push(['Helpdesk', staff.name, staff.completedToday.toString(), staff.averageRating.toString()])
    })
    dataToExport.staffPerformance.tpt.forEach(staff => {
      summaryData.push(['TPT', staff.name, staff.completedToday.toString(), staff.averageRating.toString()])
    })

    // Detail queue data
    const detailHeaders = ['No Antrian', 'Layanan', 'Nama Customer', 'NPWP', 'Masalah/Keluhan', 'Status', 'Waktu Dibuat', 'Waktu Dipanggil', 'Waktu Selesai', 'Waktu Tunggu', 'Ditangani Oleh', 'Solusi']
    const detailData = [detailHeaders]

    queuesToExport.forEach(queue => {
      const waitingTime = calculateWaitingTime(queue.createdAt, queue.status, queue.calledAt)
      const serviceDuration = queue.startedAt && queue.calledAt ?
        Math.round((new Date(queue.startedAt).getTime() - new Date(queue.calledAt).getTime()) / (1000 * 60)) + ' menit' :
        '-'

      detailData.push([
        queue.queueNumber,
        queue.serviceType,
        queue.customerName,
        queue.customerNpwp,
        queue.notes || 'Konsultasi umum',
        queue.status === 'WAITING' ? 'Menunggu' :
        queue.status === 'CALLED' ? 'Dipanggil' :
        queue.status === 'IN_PROGRESS' ? 'Dalam Proses' :
        queue.status === 'COMPLETED' ? 'Selesai' : queue.status,
        new Date(queue.createdAt).toLocaleString('id-ID'),
        queue.calledAt ? new Date(queue.calledAt).toLocaleString('id-ID') : '-',
        queue.startedAt ? new Date(queue.startedAt).toLocaleString('id-ID') : '-',
        waitingTime,
        queue.calledBy ? 'Staff' : 'Auto',
        queue.status === 'COMPLETED' ? 'Masalah berhasil diselesaikan' :
        queue.status === 'CANCELLED' ? 'Antrian dibatalkan' :
        queue.status === 'IN_PROGRESS' ? 'Sedang dalam penanganan' :
        'Menunggu penanganan'
      ])
    })

    // Escalated cases data
    const escalatedHeaders = ['No Antrian', 'Layanan', 'Nama Customer', 'NPWP', 'Waktu Escalated', 'Alasan Escalated']
    const escalatedData = [escalatedHeaders]

    dataToExport.escalatedCases.forEach(caseItem => {
      escalatedData.push([
        caseItem.queueNumber,
        caseItem.serviceType,
        caseItem.customerName,
        caseItem.customerNpwp,
        new Date(caseItem.escalatedAt).toLocaleString('id-ID'),
        caseItem.escalatedReason
      ])
    })

    // Create workbook and worksheets
    const wb = XLSX.utils.book_new()

    // Summary sheet
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan')

    // Detail sheet
    const wsDetail = XLSX.utils.aoa_to_sheet(detailData)
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Pelayanan')

    // Escalated cases sheet
    const wsEscalated = XLSX.utils.aoa_to_sheet(escalatedData)
    XLSX.utils.book_append_sheet(wb, wsEscalated, 'Kasus Escalated')

    // Generate filename with date range
    const dateSuffix = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : new Date().toISOString().split('T')[0]
    const filename = `Rekap_Pelayanan_Nawaitu_${dateSuffix}.xlsx`

    // Save file
    XLSX.writeFile(wb, filename)
  }

  const filterDataByDate = async () => {
    if (!dateFrom || !dateTo) {
      alert('Silakan pilih tanggal mulai dan tanggal akhir')
      return
    }

    setIsFiltering(true)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/filter', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateFrom: new Date(dateFrom).toISOString(),
          dateTo: new Date(dateTo).toISOString()
        })
      })

      if (response.ok) {
        const filteredData = await response.json()
        setFilteredStats(filteredData.stats)
        setFilteredQueues(filteredData.queues)
      } else {
        alert('Gagal memfilter data')
      }
    } catch (error) {
      console.error('Error filtering data:', error)
      alert('Terjadi kesalahan saat memfilter data')
    } finally {
      setIsFiltering(false)
    }
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setFilteredStats(null)
    setFilteredQueues([])
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
                <p className="text-sm text-gray-600">Monitoring & Kontrol Nawaitu</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                👋 <span className="font-medium">{user.name}</span>
              </div>
              <UserAvatar showFeedbackButton={false} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'monitoring', name: 'Monitoring Real-time', icon: '📊' },
              { id: 'rekap', name: 'Rekap Pelayanan', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'monitoring' && (
          <>
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
              {queues.map((queue, index) => {
                const waitingQueues = queues.filter(q => q.status === 'WAITING')
                const showTimer = waitingQueues.length > 1 && queue.status === 'WAITING' // Show timer for all waiting customers when there are 2+ in queue
                
                return (
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
                )
              })}

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

          {/* Service History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 text-lg">📋</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Riwayat Pelayanan</h3>
                <p className="text-sm text-gray-600">Monitor semua pelayanan yang telah selesai dengan feedback dan rating</p>
              </div>
            </div>
            <ServiceHistory serviceType="ALL" />
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
          </>
        )}

        {activeTab === 'rekap' && (
          <div className="space-y-8">
            {/* Rekap Pelayanan Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📋</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Rekap Pelayanan</h2>
                  <p className="text-sm text-gray-600">Ringkasan dan laporan pelayanan harian</p>
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={filterDataByDate}
                    disabled={isFiltering}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFiltering ? '🔄 Memproses...' : '🔍 Filter'}
                  </button>
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    title="Hapus Filter"
                  >
                    🗑️
                  </button>
                </div>
                <div className="flex items-end">
                  <div className="text-sm text-gray-600">
                    {filteredStats ? (
                      <span className="text-green-600 font-medium">✅ Data Difilter</span>
                    ) : (
                      <span>Data Real-time</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pelayanan</p>
                    <p className="text-2xl font-bold text-gray-900">{(filteredStats || stats).total.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📊</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Helpdesk</p>
                    <p className="text-2xl font-bold text-gray-900">{(filteredStats || stats).helpdesk.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-xl">🖥️</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">TPT</p>
                    <p className="text-2xl font-bold text-gray-900">{(filteredStats || stats).tpt.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-xl">🏢</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rata-rata Rating</p>
                    <p className="text-2xl font-bold text-gray-900">4.2</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 text-xl">⭐</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 text-lg">📈</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Evaluasi Performa Staff</h3>
                  <p className="text-sm text-gray-600">Grafik produktivitas dan rating staff</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Helpdesk Staff Chart */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Staff Helpdesk
                  </h4>
                  <div className="space-y-3">
                    {(filteredStats || stats).staffPerformance.helpdesk.map((staff, index) => {
                      const maxCompleted = Math.max(...(filteredStats || stats).staffPerformance.helpdesk.map(s => s.completedToday), 1)
                      const barWidth = (staff.completedToday / maxCompleted) * 100

                      return (
                        <div key={staff.id} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium text-gray-700 truncate" title={staff.name}>
                            {staff.name}
                          </div>
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-6 relative">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                                style={{ width: `${barWidth}%` }}
                              >
                                <span className="text-xs font-bold text-white">{staff.completedToday}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 w-16 justify-end">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm font-semibold text-gray-700">{staff.averageRating}</span>
                          </div>
                        </div>
                      )
                    })}
                    {(filteredStats || stats).staffPerformance.helpdesk.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-3xl mb-2">👥</div>
                        <p>Tidak ada data performa staff helpdesk</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* TPT Staff Chart */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    Staff TPT
                  </h4>
                  <div className="space-y-3">
                    {(filteredStats || stats).staffPerformance.tpt.map((staff, index) => {
                      const maxCompleted = Math.max(...(filteredStats || stats).staffPerformance.tpt.map(s => s.completedToday), 1)
                      const barWidth = (staff.completedToday / maxCompleted) * 100

                      return (
                        <div key={staff.id} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium text-gray-700 truncate" title={staff.name}>
                            {staff.name}
                          </div>
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-6 relative">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                                style={{ width: `${barWidth}%` }}
                              >
                                <span className="text-xs font-bold text-white">{staff.completedToday}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 w-16 justify-end">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-sm font-semibold text-gray-700">{staff.averageRating}</span>
                          </div>
                        </div>
                      )
                    })}
                    {(filteredStats || stats).staffPerformance.tpt.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-3xl mb-2">👥</div>
                        <p>Tidak ada data performa staff TPT</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(filteredStats || stats).staffPerformance.helpdesk.reduce((sum, staff) => sum + staff.completedToday, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Helpdesk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {(filteredStats || stats).staffPerformance.tpt.reduce((sum, staff) => sum + staff.completedToday, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total TPT</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {((filteredStats || stats).staffPerformance.helpdesk.reduce((sum, staff) => sum + staff.averageRating, 0) / Math.max((filteredStats || stats).staffPerformance.helpdesk.length, 1) +
                          (filteredStats || stats).staffPerformance.tpt.reduce((sum, staff) => sum + staff.averageRating, 0) / Math.max((filteredStats || stats).staffPerformance.tpt.length, 1)) / 2}
                      </div>
                      <div className="text-sm text-gray-600">Rata-rata Rating</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Report Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detail Pelayanan</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Layanan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rata-rata Waktu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {filteredStats ? `${dateFrom} - ${dateTo}` : new Date().toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Helpdesk</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(filteredStats || stats).helpdesk.completed}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12m 30s</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">4.3 ⭐</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {filteredStats ? `${dateFrom} - ${dateTo}` : new Date().toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">TPT</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(filteredStats || stats).tpt.completed}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">18m 45s</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">4.1 ⭐</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rekap Antrian Detail Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Rekap Antrian Detail</h3>
                <p className="text-sm text-gray-600">Detail masalah pelanggan, status antrian, dan penanganan</p>

                {/* Problem Category Summary Box */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {(() => {
                    const baseQueues = filteredQueues.length > 0 ? filteredQueues : queues
                    const complaintCounts = {
                      PELAPORAN_PAJAK: baseQueues.filter(q => getComplaintType(q.notes || 'Konsultasi umum') === 'PELAPORAN_PAJAK').length,
                      AKSES_SISTEM: baseQueues.filter(q => getComplaintType(q.notes || 'Konsultasi umum') === 'AKSES_SISTEM').length,
                      PEMBAYARAN: baseQueues.filter(q => getComplaintType(q.notes || 'Konsultasi umum') === 'PEMBAYARAN').length,
                      REGISTRASI: baseQueues.filter(q => getComplaintType(q.notes || 'Konsultasi umum') === 'REGISTRASI').length,
                      VERIFIKASI: baseQueues.filter(q => getComplaintType(q.notes || 'Konsultasi umum') === 'VERIFIKASI').length,
                      DOKUMEN: baseQueues.filter(q => getComplaintType(q.notes || 'Konsultasi umum') === 'DOKUMEN').length,
                      LAINNYA: baseQueues.filter(q => getComplaintType(q.notes || 'Konsultasi umum') === 'LAINNYA').length,
                    }

                    return [
                      { label: 'Pelaporan Pajak', count: complaintCounts.PELAPORAN_PAJAK, color: 'bg-blue-100 text-blue-800', icon: '📊' },
                      { label: 'Akses Sistem', count: complaintCounts.AKSES_SISTEM, color: 'bg-purple-100 text-purple-800', icon: '💻' },
                      { label: 'Pembayaran', count: complaintCounts.PEMBAYARAN, color: 'bg-green-100 text-green-800', icon: '💰' },
                      { label: 'Registrasi', count: complaintCounts.REGISTRASI, color: 'bg-yellow-100 text-yellow-800', icon: '📝' },
                      { label: 'Verifikasi', count: complaintCounts.VERIFIKASI, color: 'bg-indigo-100 text-indigo-800', icon: '✅' },
                      { label: 'Dokumen', count: complaintCounts.DOKUMEN, color: 'bg-pink-100 text-pink-800', icon: '📄' },
                      { label: 'Lainnya', count: complaintCounts.LAINNYA, color: 'bg-gray-100 text-gray-800', icon: '📋' },
                    ].map((complaint) => (
                      <div key={complaint.label} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-600 truncate">{complaint.label}</p>
                            <p className="text-lg font-bold text-gray-900">{complaint.count}</p>
                          </div>
                          <div className="text-lg ml-2 flex-shrink-0">{complaint.icon}</div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                {/* Filters */}
                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                      Cari Customer
                    </label>
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Cari nama customer..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
                      Layanan
                    </label>
                    <select
                      id="serviceType"
                      value={serviceTypeFilter}
                      onChange={(e) => {
                        setServiceTypeFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="ALL">Semua Layanan</option>
                      <option value="HELPDESK">Helpdesk</option>
                      <option value="TPT">TPT</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="complaint" className="block text-sm font-medium text-gray-700 mb-1">
                      Masalah/Keluhan
                    </label>
                    <select
                      id="complaint"
                      value={complaintFilter}
                      onChange={(e) => {
                        setComplaintFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="ALL">Semua Masalah</option>
                      <option value="PELAPORAN_PAJAK">Pelaporan Pajak</option>
                      <option value="AKSES_SISTEM">Akses Sistem</option>
                      <option value="PEMBAYARAN">Pembayaran</option>
                      <option value="REGISTRASI">Registrasi</option>
                      <option value="VERIFIKASI">Verifikasi</option>
                      <option value="DOKUMEN">Dokumen</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setServiceTypeFilter('ALL')
                        setComplaintFilter('ALL')
                        setCurrentPage(1)
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No Antrian
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Layanan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Masalah/Keluhan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waktu Tunggu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ditangani Oleh
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solusi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredData = getFilteredQueues()
                      const startIndex = (currentPage - 1) * itemsPerPage
                      const endIndex = startIndex + itemsPerPage
                      const paginatedData = filteredData.slice(startIndex, endIndex)

                      return paginatedData.map((queue) => {
                        const waitingTime = calculateWaitingTime(queue.createdAt, queue.status, queue.calledAt)
                        const serviceDuration = queue.startedAt && queue.calledAt ?
                          Math.round((new Date(queue.startedAt).getTime() - new Date(queue.calledAt).getTime()) / (1000 * 60)) + ' menit' :
                          '-'

                        return (
                          <tr key={queue.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {queue.queueNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                queue.serviceType === 'HELPDESK'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {queue.serviceType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {queue.customerName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate" title={queue.notes || 'Tidak ada catatan khusus'}>
                                {queue.notes || 'Konsultasi umum'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                queue.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : queue.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : queue.status === 'WAITING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : queue.status === 'CALLED'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {queue.status === 'WAITING' ? 'Menunggu' :
                                 queue.status === 'CALLED' ? 'Dipanggil' :
                                 queue.status === 'IN_PROGRESS' ? 'Dalam Proses' :
                                 queue.status === 'COMPLETED' ? 'Selesai' :
                                 queue.status === 'CANCELLED' ? 'Dibatalkan' : queue.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {waitingTime}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {queue.calledBy ? (
                                <div className="flex items-center">
                                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-xs text-indigo-600">👤</span>
                                  </div>
                                  <span>{queue.calledById ? 'Staff' : 'Auto'}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate" title={queue.status === 'COMPLETED' ? 'Masalah berhasil diselesaikan' : queue.status === 'CANCELLED' ? 'Antrian dibatalkan' : 'Dalam proses penanganan'}>
                                {queue.status === 'COMPLETED' ? '✅ Masalah berhasil diselesaikan' :
                                 queue.status === 'CANCELLED' ? '❌ Antrian dibatalkan' :
                                 queue.status === 'IN_PROGRESS' ? '🔄 Sedang dalam penanganan' :
                                 '⏳ Menunggu penanganan'}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    })()}
                    {getFilteredQueues().length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <div className="text-4xl mb-2">📋</div>
                          <p>Tidak ada data antrian yang sesuai dengan filter</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {getFilteredQueues().length > itemsPerPage && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, getFilteredQueues().length)} sampai{' '}
                      {Math.min(currentPage * itemsPerPage, getFilteredQueues().length)} dari{' '}
                      {getFilteredQueues().length} hasil
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ‹ Sebelumnya
                      </button>

                      {(() => {
                        const totalPages = Math.ceil(getFilteredQueues().length / itemsPerPage)
                        const pages = []
                        const maxVisiblePages = 5
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1)
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(i)
                        }

                        return pages.map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm border rounded-md ${
                              page === currentPage
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-gray-300 bg-white hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))
                      })()}

                      <button
                        onClick={() => setCurrentPage(Math.min(Math.ceil(getFilteredQueues().length / itemsPerPage), currentPage + 1))}
                        disabled={currentPage === Math.ceil(getFilteredQueues().length / itemsPerPage)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Selanjutnya ›
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Options */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Laporan</h3>
              <div className="flex gap-4 flex-wrap">
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors" onClick={exportDetailedQueueToExcel}>
                  📋 Export Rekap Antrian Detail
                </button>
                <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors" onClick={exportToExcel}>
                  📊 Export Laporan Lengkap
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Export Rekap Antrian Detail: Data detail antrian dalam format Excel dengan kolom lengkap
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}