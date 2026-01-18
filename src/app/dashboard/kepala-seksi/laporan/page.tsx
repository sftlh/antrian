'use client'

import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import { Calendar, Download, Search, FileSpreadsheet, Loader2, ArrowLeft, Filter, BarChart3, Users, Clock, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'

interface QueueData {
  id: string
  queueNumber: string
  serviceType: string
  status: string
  priorityLevel: string
  customerName: string
  customerNpwp: string
  customerPhone: string | null
  calledBy: string | null
  calledByName: string | null // Added
  calledAt: string | null
  startedAt: string | null
  completedAt: string | null // Added
  cancelledAt: string | null // Added
  serviceDuration: number | null // Added
  notes: string | null
  internalNotes: string | null // Added
  rating: number | null
  feedback: string | null
  neatnessRating: number | null // Added
  materialMasteryRating: number | null // Added
  communicationRating: number | null // Added
  createdAt: string
  escalatedTo: string | null
  escalatedToName: string | null // Added
  escalatedAt: string | null
  escalatedReason: string | null
  serviceOrder: number | null // Added
  category: string | null
}

interface StatsData {
  helpdesk: { waiting: number; inProgress: number; completed: number; escalated: number; cancelled: number }
  tpt: { waiting: number; inProgress: number; completed: number; escalated: number; cancelled: number }
  total: { waiting: number; inProgress: number; completed: number; escalated: number; cancelled: number }
  staffPerformance: {
    helpdesk: Array<{ id: string; name: string; completedToday: number; averageRating: number }>
    tpt: Array<{ id: string; name: string; completedToday: number; averageRating: number }>
  }
}

export default function LaporanPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ stats: StatsData; queues: QueueData[] } | null>(null)

  const handleFetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dateFrom, dateTo })
      })

      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        console.error('Failed to fetch report')
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!data || !data.queues.length) return

    // Prepare data for export - Mapping ALL fields
    const exportData = data.queues.map(q => ({
      'ID Antrian': q.id,
      'Nomor Antrian': q.queueNumber,
      'Jenis Layanan': q.serviceType,
      'Kategori': q.category || '-',
      'Status': q.status,
      'Prioritas': q.priorityLevel,
      'Nama Wajib Pajak': q.customerName,
      'NPWP': q.customerNpwp,
      'No. Telepon': q.customerPhone || '-',
      'Waktu Dibuat': new Date(q.createdAt).toLocaleString('id-ID'),
      'Waktu Dipanggil': q.calledAt ? new Date(q.calledAt).toLocaleString('id-ID') : '-',
      'Waktu Mulai': q.startedAt ? new Date(q.startedAt).toLocaleString('id-ID') : '-',
      'Waktu Selesai': q.completedAt ? new Date(q.completedAt).toLocaleString('id-ID') : '-',
      'Waktu Dibatalkan': q.cancelledAt ? new Date(q.cancelledAt).toLocaleString('id-ID') : '-',
      'Durasi Pelayanan (Menit)': q.serviceDuration || 0,
      'Petugas': q.calledByName || '-',
      'Petugas ID': q.calledBy || '-',
      'Catatan': q.notes || '-',
      'Catatan Internal': q.internalNotes || '-',
      'Rating Umum': q.rating || '-',
      'Rating Kerapihan': q.neatnessRating || '-',
      'Rating Penguasaan Materi': q.materialMasteryRating || '-',
      'Rating Komunikasi': q.communicationRating || '-',
      'Ulasan': q.feedback || '-',
      'Dieskalasi Ke': q.escalatedToName || '-',
      'Waktu Eskalasi': q.escalatedAt ? new Date(q.escalatedAt).toLocaleString('id-ID') : '-',
      'Alasan Eskalasi': q.escalatedReason || '-',
      'Urutan Layanan': q.serviceOrder || '-'
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Adjust column widths
    const colWidths = Object.keys(exportData[0]).map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Antrian')
    
    const fileName = `Laporan_Antrian_${dateFrom}_sd_${dateTo}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="space-y-2">
            <button 
              onClick={() => router.back()} 
              className="flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Laporan & Rekapitulasi</h1>
            <p className="text-slate-500">Analisis data antrian dan performa pelayanan perpajakan.</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
             {/* Additional logic or actions could go here */}
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row gap-6 items-end">
             <div className="w-full md:w-auto space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Tanggal Mulai
                </label>
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
             </div>
             <div className="w-full md:w-auto space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Tanggal Selesai
                </label>
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
             </div>
             <button 
                onClick={handleFetchReport}
                disabled={loading}
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
             >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                Tampilkan Data
             </button>
             {data && (
                <button 
                  onClick={exportToExcel}
                  className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm ml-auto"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download Excel Lengkap
                </button>
             )}
          </div>
        </div>

        {data ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                 <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total Antrian</p>
                      <h3 className="text-3xl font-bold text-slate-800 mt-1">{data.stats.total.waiting + data.stats.total.inProgress + data.stats.total.completed + data.stats.total.cancelled + data.stats.total.escalated}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Users className="w-6 h-6" />
                    </div>
                 </div>
                 <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded-full">Helpdesk: {data.stats.helpdesk.waiting + data.stats.helpdesk.inProgress + data.stats.helpdesk.completed + data.stats.helpdesk.cancelled + data.stats.helpdesk.escalated}</span>
                    <span className="bg-slate-100 px-2 py-1 rounded-full">TPT: {data.stats.tpt.waiting + data.stats.tpt.inProgress + data.stats.tpt.completed + data.stats.tpt.cancelled + data.stats.tpt.escalated}</span>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                 <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Selesai Dilayani</p>
                      <h3 className="text-3xl font-bold text-emerald-600 mt-1">{data.stats.total.completed}</h3>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                 </div>
                 <div className="mt-4 text-xs text-slate-500">
                    Tingkat penyelesaian: {((data.stats.total.completed / (data.stats.total.waiting + data.stats.total.inProgress + data.stats.total.completed + data.stats.total.cancelled + data.stats.total.escalated || 1)) * 100).toFixed(1)}%
                 </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                 <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total Dibatalkan</p>
                      <h3 className="text-3xl font-bold text-rose-600 mt-1">{data.stats.total.cancelled}</h3>
                    </div>
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                 <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total Eskalasi</p>
                      <h3 className="text-3xl font-bold text-amber-600 mt-1">{data.stats.total.escalated}</h3>
                    </div>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                 </div>
              </div>

            </div>

             {/* Detailed Table */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      Detail Data Antrian
                   </h3>
                   <span className="text-sm text-slate-500">{data.queues.length} data ditemukan</span>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                         <tr>
                            <th className="px-6 py-4 whitespace-nowrap">Tanggal</th>
                            <th className="px-6 py-4 whitespace-nowrap">No Antrian</th>
                            <th className="px-6 py-4 whitespace-nowrap">Layanan</th>
                            <th className="px-6 py-4 whitespace-nowrap">Status</th>
                            <th className="px-6 py-4 whitespace-nowrap">Wajib Pajak</th>
                            <th className="px-6 py-4 whitespace-nowrap">Petugas</th>
                            <th className="px-6 py-4 whitespace-nowrap">Waktu Layanan</th>
                            <th className="px-6 py-4 whitespace-nowrap">Rating</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {data.queues.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                  {new Date(item.createdAt).toLocaleDateString('id-ID')}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{item.queueNumber}</span>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                     <span>{item.serviceType}</span>
                                     <span className="text-xs text-slate-400">{item.category}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                     ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 
                                       item.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                                       item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                       item.status === 'ESCALATED' ? 'bg-amber-100 text-amber-800' :
                                       'bg-slate-100 text-slate-800'}`}>
                                     {item.status}
                                  </span>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                     <span className="font-medium text-slate-900">{item.customerName}</span>
                                     <span className="text-xs text-slate-500">{item.customerNpwp}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                  {item.calledByName || '-'}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-xs text-slate-500 space-y-0.5">
                                     <div>Mulai: {item.startedAt ? new Date(item.startedAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-'}</div>
                                     <div>Selesai: {item.completedAt ? new Date(item.completedAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-'}</div>
                                     {item.serviceDuration && <div className="font-semibold text-slate-700">{item.serviceDuration} Menit</div>}
                                  </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                  {item.rating ? (
                                     <div className="flex text-amber-400">
                                        {'★'.repeat(item.rating)}
                                        <span className="text-slate-300">{'★'.repeat(5 - item.rating)}</span>
                                     </div>
                                  ) : (
                                     <span className="text-slate-400 text-xs">-</span>
                                  )}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
                 {data.queues.length === 0 && (
                   <div className="p-12 text-center text-slate-500 bg-white">
                      <Search className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                      <p>Tidak ada data untuk periode yang dipilih.</p>
                   </div>
                 )}
             </div>

          </div>
        ) : (
           <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
              <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Silakan pilih rentang tanggal dan klik "Tampilkan Data"</p>
           </div>
        )}

      </div>
    </div>
  )
}
