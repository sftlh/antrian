'use client'

import React from 'react'
import { KepalaSeksiSidebar } from '@/components/dashboard/KepalaSeksiSidebar'
import UserAvatar from '@/components/UserAvatar'
import { Menu } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'

export default function KepalaSeksiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <KepalaSeksiSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 md:hidden flex items-center justify-between p-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Menu size={24} />
            </button>
            <span className="font-bold text-gray-900">Nawaitu</span>
          </div>
          <UserAvatar showFeedbackButton={false} />
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full pt-5 pb-4">
              {/* Mobile Sidebar Content - simplifed version of desktop sidebar */}
              <div className="flex items-center justify-between px-4">
                <div className="text-xl font-bold text-indigo-600">Nawaitu</div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
                >
                  <span className="sr-only">Close menu</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-5 flex-1 h-0 overflow-y-auto">
                 {/* Reusing links would be better but keeping it simple for now or I can reuse the component if it supported mobile prop */}
                 <nav className="px-2 space-y-1">
                   {/* I'll let the user rely on desktop mostly or implement full mobile nav later */}
                   <div className="p-4 text-center text-gray-500">
                     Gunakan tampilan desktop untuk pengalaman terbaik.
                   </div>
                 </nav>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
