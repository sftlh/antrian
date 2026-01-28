'use client'

import React, { useState, useEffect } from 'react'
import { Activity, RefreshCw, Clock, User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { QueueItem } from '../types'
import { useAuth } from '@/lib/auth/context'

export default function AntrianPage() {
  const { user } = useAuth()
  const [queues, setQueues] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchQueues = async (background = false) => {
    try {
      if (!background) setIsRefreshing(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/queues', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQueues(data.queues || [])
      }
    } catch (error) {
      console.error('Failed to fetch queues:', error)
    } finally {
      setIsLoading(false)
      if (!background) setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchQueues()
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchQueues(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'CALLED': return 'bg-purple-50 text-purple-700 border-purple-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH' || priority === 'URGENT') return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Antrian</h1>
          <p className="text-gray-500 mt-1">Daftar lengkap antrian aktif saat ini</p>
        </div>
        <button 
          onClick={() => fetchQueues(false)}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors ${isRefreshing ? 'opacity-70' : ''}`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Memuat...' : 'Refresh Data'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Activity className="text-indigo-600" size={20} />
            <h3 className="font-bold text-gray-800">Antrian Aktif</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              {queues.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">Memuat data antrian...</p>
            </div>
          </div>
        ) : queues.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Semua Terkendali!</h3>
            <p className="text-gray-500 mt-1">Tidak ada antrian yang sedang menunggu atau berjalan saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-24">No. Antrian</th>
                  <th className="px-6 py-4">Layanan</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Waktu Tunggu</th>
                  <th className="px-6 py-4">Petugas</th>
                  <th className="px-6 py-4">Prioritas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queues.map((queue) => (
                  <tr key={queue.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-lg font-bold text-gray-900">{queue.queueNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {queue.serviceType === 'HELPDESK' ? 'Helpdesk' : 'TPT'}
                        </span>
                        <span className="text-xs text-gray-400">Umum</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                          {queue.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{queue.customerName}</div>
                          <div className="text-xs text-gray-400 font-mono">{queue.customerNpwp}</div>
                          {queue.customerContacts && queue.customerContacts.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {queue.customerContacts.map((contact, idx) => (
                                <div key={idx} className="flex flex-col text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                                   <div className="font-semibold text-gray-700">{contact.name}</div>
                                   <div className="mt-1 flex flex-col gap-1">
                                     {contact.phone && (
                                       <div className="flex items-center gap-1">
                                         <span className="text-gray-400">Tel:</span>
                                         <span>{contact.phone}</span>
                                       </div>
                                     )}
                                     {contact.idCardScan && (
                                       <a href={contact.idCardScan} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                                         Lihat KTP
                                       </a>
                                     )}
                                   </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(queue.status)}`}>
                        {queue.status === 'WAITING' && 'Menunggu'}
                        {queue.status === 'IN_PROGRESS' && 'Sedang Dilayani'}
                        {queue.status === 'CALLED' && 'Dipanggil'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock size={16} />
                        <span>
                          {Math.floor((new Date().getTime() - new Date(queue.createdAt).getTime()) / 60000)} menit
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {queue.calledBy ? (
                        <div className="flex items-center gap-2 text-gray-700">
                          <User size={16} className="text-gray-400" />
                          <span className="font-medium">{queue.calledBy}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">- Belum ada -</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(queue.priorityLevel)}`}>
                         {queue.priorityLevel}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
