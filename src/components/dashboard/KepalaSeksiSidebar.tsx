'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Activity, Users, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'

export function KepalaSeksiSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard/kepala-seksi',
      icon: LayoutDashboard,
      exact: true
    },
    {
      title: 'Laporan',
      href: '/dashboard/kepala-seksi/laporan',
      icon: FileText
    },
    {
      title: 'Antrian',
      href: '/dashboard/kepala-seksi/antrian',
      icon: Activity
    },
    {
      title: 'Performa Staff',
      href: '/dashboard/kepala-seksi/staff',
      icon: Users
    }
  ]

  return (
    <aside 
      className={cn(
        "bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 flex flex-col z-10 hidden md:flex",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between border-b border-gray-100">
        {!isCollapsed && (
          <div className="flex items-center gap-3 transition-opacity duration-300">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
              N
            </div>
            <span className="font-bold text-gray-800 text-lg">Nawaitu</span>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href
            : pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-indigo-50 text-indigo-700 font-medium shadow-sm" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon 
                size={22} 
                className={cn(
                  "transition-colors",
                  isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                )} 
              />
              {!isCollapsed && <span>{item.title}</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.title}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium">Keluar</span>}
        </button>
      </div>
    </aside>
  )
}
