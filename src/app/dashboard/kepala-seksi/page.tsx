'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Bell, RefreshCw, AlertCircle, Clock, CheckCircle2, XCircle, Activity, ArrowUpRight, Users } from 'lucide-react'
import { QueueStats, QueueItem } from './types'
import ServiceHistory from '@/components/ServiceHistory'

export default function KepalaSeksiDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<QueueStats>({
    helpdesk: { waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 },
    tpt: { waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 },
    spt: { waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 },
    total: { waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 },
    staffPerformance: { helpdesk: [], tpt: [], spt: [] },
    escalatedCases: []
  })
  
  // Real-time state
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [urgentAlert, setUrgentAlert] = useState(false)
  const [refreshInterval] = useState(5)

  // Fetch data
  const fetchStats = async (background = false) => {
    try {
      if (!background) setIsRefreshing(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/dashboard/kepala-seksi/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setLastRefresh(new Date())
        
        // Simple check for urgent items (waiting > 10 or something, or just based on waiting count)
        const totalWaiting = data.stats.total.waiting
        setUrgentAlert(totalWaiting > 5) // Example threshold
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      if (!background) setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    let interval: NodeJS.Timeout | null = null
    
    if (autoRefresh) {
      interval = setInterval(() => fetchStats(true), refreshInterval * 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  // Components for the dashboard
  const StatCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
          <Icon className={colorClass.replace('bg-', 'text-')} size={24} />
        </div>
        <span className="flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
          Hari ini
        </span>
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {subtext && <span className="text-xs text-gray-400 mb-1">{subtext}</span>}
      </div>
    </div>
  )

  const ServiceStats = ({ title, data, type }: { title: string, data: any, type: 'helpdesk' | 'tpt' | 'spt' }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <span className={`w-2 h-8 rounded-full ${type === 'helpdesk' ? 'bg-blue-500' : type === 'tpt' ? 'bg-purple-500' : 'bg-green-500'}`}></span>
          {title}
        </h3>
        <div className="flex gap-2 text-sm text-gray-500">
           <span className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-100">{data.completed} Selesai</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
          <div className="text-sm text-orange-600 mb-1 font-medium">Menunggu</div>
          <div className="text-2xl font-bold text-gray-800">{data.waiting}</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="text-sm text-blue-600 mb-1 font-medium">Proses</div>
          <div className="text-2xl font-bold text-gray-800">{data.inProgress}</div>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="text-sm text-red-600 mb-1 font-medium">Eskalasi</div>
          <div className="text-2xl font-bold text-gray-800">{data.escalated}</div>
        </div>
         <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1 font-medium">Batal</div>
          <div className="text-2xl font-bold text-gray-800">{data.cancelled}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-sm text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-md">Kepala Seksi Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Selamat Datang, {user?.name} 👋</h1>
          <p className="text-gray-500 mt-1">Berikut adalah ringkasan aktivitas pelayanan hari ini.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="px-3 py-1 flex items-center gap-2">
            <span className={`relative flex h-3 w-3`}>
              {autoRefresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            </span>
            <span className="text-sm font-medium text-gray-700">{autoRefresh ? 'Real-time On' : 'Real-time Off'}</span>
          </div>
          
          <div className="h-6 w-px bg-gray-200"></div>
          
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
            title={autoRefresh ? "Pause updates" : "Resume updates"}
          >
            <Activity size={18} />
          </button>
          
          <button 
            onClick={() => fetchStats()} 
            disabled={isRefreshing}
            className={`p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh now"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Urgent Alert Banner */}
      {urgentAlert && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 animate-pulse">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <div>
              <h4 className="font-bold text-red-900">Antrian Menumpuk!</h4>
              <p className="text-red-700 text-sm">Terdapat {stats.total.waiting} antrian menunggu. Mohon periksa ketersediaan staff.</p>
            </div>
          </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Antrian" 
          value={stats.total.waiting + stats.total.inProgress + stats.total.completed + stats.total.escalated + stats.total.cancelled} 
          icon={Users}
          colorClass="text-indigo-600 bg-indigo-500"
        />
        <StatCard 
          title="Sedang Menunggu" 
          value={stats.total.waiting} 
          icon={Clock}
          colorClass="text-orange-600 bg-orange-500"
          subtext="Org"
        />
        <StatCard 
          title="Dalam Pelayanan" 
          value={stats.total.inProgress} 
          icon={Activity}
          colorClass="text-blue-600 bg-blue-500"
          subtext="Org"
        />
        <StatCard 
          title="Selesai Dilayani" 
          value={stats.total.completed} 
          icon={CheckCircle2}
          colorClass="text-green-600 bg-green-500"
          subtext="Org"
        />
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceStats title="Layanan Helpdesk" data={stats.helpdesk} type="helpdesk" />
        <ServiceStats title="Layanan TPT" data={stats.tpt} type="tpt" />
        <ServiceStats title="Layanan SPT" data={stats.spt} type="spt" />
      </div>

      {/* Alert / Escalations */}
      {stats.escalatedCases.length > 0 && (
         <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-6 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <AlertCircle className="text-red-500" size={20} />
                 Kasus Dieskalasi
               </h3>
               <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                 {stats.escalatedCases.length} Kasus
               </span>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.escalatedCases.map((c) => (
                <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">{c.queueNumber}</span>
                       <span className="font-medium text-gray-900">{c.customerName}</span>
                     </div>
                     <p className="text-sm text-gray-500">{c.escalatedReason}</p>
                  </div>
                  <div className="text-right">
                     <div className="text-xs text-gray-400 mb-1">{new Date(c.escalatedAt).toLocaleTimeString()}</div>
                     <button className="text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Lihat Detail
                     </button>
                  </div>
                </div>
              ))}
            </div>
         </div>
      )}
      
      {/* Service History Mini View */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
         <div className="flex items-center justify-between mb-4">
           <h3 className="font-bold text-gray-800">Riwayat Pelayanan Terbaru</h3>
           <button className="text-sm text-indigo-600 font-medium hover:underline">Lihat Semua</button>
         </div>
         {/* We reuse the ServiceHistory component but we might want to limit it or pass props to make it compact if it supported it. For now just render it. */}
         <ServiceHistory serviceType="ALL" />
      </div>
    </div>
  )
}
