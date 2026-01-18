'use client'

import React, { useState, useEffect } from 'react'
import { Users, Star, CheckCircle2, Trophy, ArrowRight, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { QueueStats } from '../types'

export default function StaffPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

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
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const StaffCard = ({ staff, rank }: { staff: any, rank: number }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:border-indigo-100 transition-colors relative overflow-hidden">
       {/* Rank Badge */}
       {rank <= 3 && (
        <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl ${
          rank === 1 ? 'bg-yellow-100 text-yellow-600' :
          rank === 2 ? 'bg-gray-100 text-gray-600' :
          'bg-orange-100 text-orange-600'
        }`}>
          <Trophy size={18} />
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          {staff.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{staff.name}</h3>
          <p className="text-xs text-gray-500">ID: {staff.id.substring(0, 8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <div className="flex items-center gap-2 text-green-700 text-xs font-bold mb-1">
            <CheckCircle2 size={14} />
            Selesai
          </div>
          <p className="text-2xl font-bold text-gray-800">{staff.completedToday}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
          <div className="flex items-center gap-2 text-yellow-700 text-xs font-bold mb-1">
            <Star size={14} />
            Rating
          </div>
          <p className="text-2xl font-bold text-gray-800">{Number(staff.averageRating).toFixed(1)}</p>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-50">
         <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div 
              className="bg-indigo-500 h-2 rounded-full" 
              style={{ width: `${Math.min((staff.averageRating / 5) * 100, 100)}%` }}
            ></div>
         </div>
         <div className="flex justify-between text-xs text-gray-500">
           <span>Kepuasan Pelanggan</span>
           <span>{(staff.averageRating / 5 * 100).toFixed(0)}%</span>
         </div>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="col-span-full p-12 flex flex-col items-center justify-center text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
        <Users size={24} />
      </div>
      <p className="text-gray-500">Belum ada data performa staff untuk ditampilkan.</p>
    </div>
  )

  if (isLoading) {
    return (
       <div className="min-h-screen p-8 flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
       </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performa Staff</h1>
          <p className="text-gray-500 mt-1">Evaluasi kinerja petugas Helpdesk dan TPT hari ini</p>
        </div>
        <button 
          onClick={fetchStats}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors ${isRefreshing ? 'opacity-70' : ''}`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Memuat...' : 'Refresh Data'}
        </button>
      </div>

      {stats && (
        <div className="space-y-10">
          {/* Helpdesk Section */}
          <section>
             <div className="flex items-center gap-2 mb-6">
                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                <h2 className="text-lg font-bold text-gray-800">Staff Helpdesk</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {stats.staffPerformance.helpdesk.length > 0 ? (
                 stats.staffPerformance.helpdesk
                   .sort((a, b) => b.completedToday - a.completedToday)
                   .map((staff, index) => (
                     <StaffCard key={staff.id} staff={staff} rank={index + 1} />
                   ))
               ) : <EmptyState />}
             </div>
          </section>

          {/* TPT Section */}
          <section>
             <div className="flex items-center gap-2 mb-6">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                <h2 className="text-lg font-bold text-gray-800">Staff TPT</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {stats.staffPerformance.tpt.length > 0 ? (
                 stats.staffPerformance.tpt
                   .sort((a, b) => b.completedToday - a.completedToday)
                   .map((staff, index) => (
                     <StaffCard key={staff.id} staff={staff} rank={index + 1} />
                   ))
               ) : <EmptyState />}
             </div>
          </section>
        </div>
      )}
    </div>
  )
}
