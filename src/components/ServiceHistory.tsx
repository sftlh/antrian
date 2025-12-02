'use client'

import { useState, useEffect, useCallback } from 'react'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

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

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return '-'
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  if (loading && serviceHistory.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Memuat riwayat layanan...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Ringkasan Penilaian</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalFeedback}</div>
              <div className="text-sm text-gray-600">Total Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.averageRating || '-'}</div>
              <div className="text-sm text-gray-600">Rating Rata-rata</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.averageNeatness || '-'}</div>
              <div className="text-sm text-gray-600">Kerapian</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.averageMaterialMastery || '-'}</div>
              <div className="text-sm text-gray-600">Penguasaan Materi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.averageCommunication || '-'}</div>
              <div className="text-sm text-gray-600">Komunikasi</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Download */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold">Riwayat Layanan</h3>

          <div className="flex flex-col sm:flex-row gap-2">
            {showFilters && (
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'today' | 'month' | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="today">Hari Ini</option>
                <option value="month">Bulan Ini</option>
                <option value="all">Semua</option>
              </select>
            )}

            <div className="flex gap-2">
              <button
                onClick={downloadExcel}
                disabled={downloading}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {downloading ? '...' : '📊'} Excel
              </button>
              <button
                onClick={downloadCSV}
                disabled={downloading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {downloading ? '...' : '📄'} CSV
              </button>
            </div>
          </div>
        </div>

        {/* Service History Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Antrian
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wajib Pajak
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Petugas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceHistory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.queueNumber}</div>
                    <div className="text-sm text-gray-500">{item.serviceType}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.customer.name}</div>
                    <div className="text-sm text-gray-500">{item.customer.npwp}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.completedAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">Keseluruhan:</span> {renderStars(item.rating)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Kerapian:</span> {renderStars(item.neatnessRating)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Materi:</span> {renderStars(item.materialMasteryRating)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Komunikasi:</span> {renderStars(item.communicationRating)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <div className="text-sm text-gray-900 break-words">
                      {item.feedback || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.calledByUser?.name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {stats && stats.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Menampilkan {((currentPage - 1) * 50) + 1} sampai {Math.min(currentPage * 50, stats.totalCount)} dari {stats.totalCount} hasil
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm">
                Halaman {currentPage} dari {stats.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === stats.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

        {serviceHistory.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            Tidak ada data riwayat layanan untuk periode yang dipilih.
          </div>
        )}
      </div>
    </div>
  )
}