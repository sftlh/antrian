'use client'

import { useState, useEffect, useCallback } from 'react'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { 
  Star, 
  FileSpreadsheet, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter,
  Loader2,
  User,
  MessageSquare,
  Clock,
  Briefcase,
  Hash
} from 'lucide-react'

interface ServiceHistoryItem {
  id: string
  queueNumber: string
  serviceType: string
  serviceCategory?: string
  priorityLevel: string
  customer: {
    id: string
    name: string
    npwp: string
  }
  completedAt: string
  serviceDuration?: number
  rating?: number
  feedback?: string
  neatnessRating?: number
  materialMasteryRating?: number
  communicationRating?: number
  notes?: string
  internalNotes?: string
  calledByUser?: {
    name: string
  }
}

interface ServiceHistoryStats {
  totalFeedback: number
  averageRating: string | null
  averageNeatness: string | null
  averageMaterialMastery: string | null
  averageCommunication: string | null
  totalPages: number
  currentPage: number
  totalCount: number
}

interface ServiceHistoryProps {
  serviceType?: 'HELPDESK' | 'TPT' | 'ALL'
  showFilters?: boolean
}

export default function ServiceHistory({ serviceType = 'ALL', showFilters = true }: ServiceHistoryProps) {
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>([])
  const [stats, setStats] = useState<ServiceHistoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'month' | 'all'>('today')
  const [currentPage, setCurrentPage] = useState(1)
  const [downloading, setDownloading] = useState(false)

  const fetchServiceHistory = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const params = new URLSearchParams({
        serviceType: serviceType,
        period: period,
        page: page.toString(),
        limit: '50'
      })

      const response = await fetch(`/api/dashboard/service-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setServiceHistory(data.serviceHistory)
        setStats(data.stats)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch service history:', error)
    } finally {
      setLoading(false)
    }
  }, [serviceType, period])

  useEffect(() => {
    fetchServiceHistory(1)
  }, [fetchServiceHistory])

  const handlePageChange = (page: number) => {
    fetchServiceHistory(page)
  }

  const downloadExcel = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const params = new URLSearchParams({
        serviceType: serviceType,
        period: 'all', // Download all data
        page: '1',
        limit: '10000' // Large limit for export
      })

      const response = await fetch(`/api/dashboard/service-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const exportData = data.serviceHistory.map((item: ServiceHistoryItem) => ({
          'Nomor Antrian': item.queueNumber,
          'Jenis Layanan': item.serviceType === 'HELPDESK' ? 'Helpdesk' : 'TPT',
          'Kategori Layanan': item.serviceCategory || '-',
          'Prioritas': item.priorityLevel === 'URGENT' ? 'Mendesak' :
                      item.priorityLevel === 'HIGH' ? 'Tinggi' : 'Normal',
          'Nama Wajib Pajak': item.customer.name,
          'NPWP': item.customer.npwp,
          'Tanggal Selesai': new Date(item.completedAt).toLocaleDateString('id-ID'),
          'Durasi Layanan (menit)': item.serviceDuration || '-',
          'Rating Keseluruhan': item.rating ? `${item.rating}/5` : '-',
          'Rating Kerapian': item.neatnessRating ? `${item.neatnessRating}/5` : '-',
          'Rating Penguasaan Materi': item.materialMasteryRating ? `${item.materialMasteryRating}/5` : '-',
          'Rating Komunikasi': item.communicationRating ? `${item.communicationRating}/5` : '-',
          'Feedback': item.feedback || '-',
          'Catatan Internal': item.internalNotes || '-',
          'Petugas': item.calledByUser?.name || '-'
        }))

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Layanan')

        // Auto-size columns
        const colWidths = [
          { wch: 15 }, // Nomor Antrian
          { wch: 12 }, // Jenis Layanan
          { wch: 20 }, // Kategori Layanan
          { wch: 10 }, // Prioritas
          { wch: 25 }, // Nama Wajib Pajak
          { wch: 20 }, // NPWP
          { wch: 15 }, // Tanggal Selesai
          { wch: 20 }, // Durasi Layanan
          { wch: 18 }, // Rating Keseluruhan
          { wch: 15 }, // Rating Kerapian
          { wch: 25 }, // Rating Penguasaan Materi
          { wch: 18 }, // Rating Komunikasi
          { wch: 50 }, // Feedback
          { wch: 30 }, // Catatan Internal
          { wch: 20 }  // Petugas
        ]
        ws['!cols'] = colWidths

        const fileName = `riwayat-layanan-${serviceType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, fileName)
      }
    } catch (error) {
      console.error('Failed to download Excel:', error)
    } finally {
      setDownloading(false)
    }
  }

  const downloadCSV = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const params = new URLSearchParams({
        serviceType: serviceType,
        period: 'all',
        page: '1',
        limit: '10000'
      })

      const response = await fetch(`/api/dashboard/service-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const csvData = data.serviceHistory.map((item: ServiceHistoryItem) => ({
          'Nomor Antrian': item.queueNumber,
          'Jenis Layanan': item.serviceType === 'HELPDESK' ? 'Helpdesk' : 'TPT',
          'Kategori Layanan': item.serviceCategory || '-',
          'Prioritas': item.priorityLevel === 'URGENT' ? 'Mendesak' :
                      item.priorityLevel === 'HIGH' ? 'Tinggi' : 'Normal',
          'Nama Wajib Pajak': item.customer.name,
          'NPWP': item.customer.npwp,
          'Tanggal Selesai': new Date(item.completedAt).toLocaleDateString('id-ID'),
          'Durasi Layanan (menit)': item.serviceDuration || '-',
          'Rating Keseluruhan': item.rating ? `${item.rating}/5` : '-',
          'Rating Kerapian': item.neatnessRating ? `${item.neatnessRating}/5` : '-',
          'Rating Penguasaan Materi': item.materialMasteryRating ? `${item.materialMasteryRating}/5` : '-',
          'Rating Komunikasi': item.communicationRating ? `${item.communicationRating}/5` : '-',
          'Feedback': `"${(item.feedback || '').replace(/"/g, '""')}"`,
          'Catatan Internal': `"${(item.internalNotes || '').replace(/"/g, '""')}"`,
          'Petugas': item.calledByUser?.name || '-'
        }))

        const headers = Object.keys(csvData[0]).join(',')
        const rows = csvData.map((row: any) => Object.values(row).join(','))
        const csv = [headers, ...rows].join('\n')

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const fileName = `riwayat-layanan-${serviceType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
        saveAs(blob, fileName)
      }
    } catch (error) {
      console.error('Failed to download CSV:', error)
    } finally {
      setDownloading(false)
    }
  }

  const renderStars = (rating: number | null | undefined, size: number = 14) => {
    if (!rating) return <span className="text-gray-300 text-xs">-</span>
    
    return (
      <div className="flex gap-0.5" title={`Rating: ${rating}/5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={size} 
            className={`${star <= rating 
              ? 'fill-amber-400 text-amber-400' 
              : 'fill-gray-100 text-gray-200'}`} 
          />
        ))}
      </div>
    )
  }

  const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value || '-'}</p>
      </div>
    </div>
  )

  if (loading && serviceHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
        <span className="text-sm font-medium">Sedang memuat riwayat layanan...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Statistics Overview Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
           <div className="bg-indigo-600 p-4 rounded-xl shadow-md text-white flex flex-col justify-between">
              <div className="flex items-center gap-2 opacity-90">
                <MessageSquare size={18} />
                <span className="text-sm font-medium">Total Feedback</span>
              </div>
              <div className="text-3xl font-bold mt-2">{stats.totalFeedback}</div>
           </div>
           
           <StatCard 
             label="Rata-rata Rating" 
             value={stats.averageRating || '-'} 
             icon={Star} 
             color="bg-amber-500" 
           />
           <StatCard 
             label="Kerapian" 
             value={stats.averageNeatness || '-'} 
             icon={User} 
             color="bg-emerald-500" 
           />
           <StatCard 
             label="Penguasaan Materi" 
             value={stats.averageMaterialMastery || '-'} 
             icon={Briefcase} 
             color="bg-blue-500" 
           />
           <StatCard 
             label="Komunikasi" 
             value={stats.averageCommunication || '-'} 
             icon={MessageSquare} 
             color="bg-purple-500" 
           />
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Toolbar */}
        <div className="bg-white p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock size={20} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">Riwayat Layanan</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {showFilters && (
              <div className="relative group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors" size={16} />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as 'today' | 'month' | 'all')}
                  className="pl-9 pr-8 py-2 bg-gray-50 hover:bg-white border border-gray-200 hover:border-indigo-300 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer w-full md:w-auto"
                >
                  <option value="today">Hari Ini</option>
                  <option value="month">Bulan Ini</option>
                  <option value="all">Semua Waktu</option>
                </select>
              </div>
            )}

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={downloadExcel}
                disabled={downloading}
                className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {downloading ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                <span>Excel</span>
              </button>
              <button
                onClick={downloadCSV}
                disabled={downloading}
                className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {downloading ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Antrian</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Wajib Pajak</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu Selesai</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Penilaian</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ulasan Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Petugas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {serviceHistory.map((item) => (
                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold font-mono text-sm border border-indigo-100">
                        {item.queueNumber}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{item.serviceType}</span>
                         {item.serviceCategory && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded w-fit mt-0.5">{item.serviceCategory}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="font-medium text-gray-900">{item.customer.name}</div>
                    <div className="text-sm text-gray-500 font-mono mt-0.5">{item.customer.npwp}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 align-top">
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-gray-400" />
                       {new Date(item.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {new Date(item.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-500 text-xs w-20">Keseluruhan</span> 
                        {renderStars(item.rating)}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-500 text-xs w-20">Kerapian</span> 
                        {renderStars(item.neatnessRating, 12)}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-500 text-xs w-20">Materi</span>
                        {renderStars(item.materialMasteryRating, 12)}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                         <span className="text-gray-500 text-xs w-20">Komunikasi</span>
                         {renderStars(item.communicationRating, 12)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top max-w-xs">
                    {item.feedback ? (
                      <div className="text-sm text-gray-700 italic bg-amber-50/50 p-2 rounded border border-amber-100/50">
                        &quot;{item.feedback}&quot;
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Tidak ada ulasan</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 align-top">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {item.calledByUser?.name?.charAt(0) || '?'}
                      </div>
                      {item.calledByUser?.name || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {serviceHistory.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/30">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <Hash className="text-gray-300" size={32} />
            </div>
            <h4 className="text-gray-900 font-medium text-lg">Tidak ada data ditemukan</h4>
            <p className="text-gray-500 mt-1 max-w-sm">
              Belum ada riwayat layanan untuk periode {period === 'today' ? 'hari ini' : period === 'month' ? 'bulan ini' : 'ini'}.
            </p>
          </div>
        )}

        {/* Pagination Footer */}
        {stats && stats.totalPages > 1 && (
          <div className="bg-white border-t border-gray-100 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Menampilkan <span className="font-medium text-gray-900">{((currentPage - 1) * 50) + 1}</span> - <span className="font-medium text-gray-900">{Math.min(currentPage * 50, stats.totalCount)}</span> dari <span className="font-medium text-gray-900">{stats.totalCount}</span> data
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="px-4 py-1.5 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
                Hal {currentPage} / {stats.totalPages}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === stats.totalPages}
                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}