'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'

interface UserAvatarProps {
  showFeedbackButton?: boolean
  feedbackUrl?: string
}

export default function UserAvatar({ showFeedbackButton = true, feedbackUrl }: UserAvatarProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile image from localStorage on mount
  useState(() => {
    const savedImage = localStorage.getItem(`profile_image_${user?.id}`)
    if (savedImage) {
      setProfileImage(savedImage)
    }
  })

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar yang valid')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Convert to base64 for local storage
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        setProfileImage(base64)
        // Save to localStorage with user ID
        localStorage.setItem(`profile_image_${user?.id}`, base64)
        setIsUploading(false)
        setIsDropdownOpen(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Failed to upload profile photo:', error)
      alert('Gagal mengupload foto profil')
      setIsUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'KEPALA_SEKSI':
        return 'from-purple-500 to-indigo-600'
      case 'PETUGAS_SPT':
          return 'from-yellow-500 to-orange-600'
        case 'TPT':
        return 'from-blue-500 to-cyan-600'
      case 'HELPDESK':
        return 'from-green-500 to-emerald-600'
      case 'RECEPTIONIST':
        return 'from-orange-500 to-red-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-4">
        {showFeedbackButton && feedbackUrl && (
          <button
            onClick={() => window.open(feedbackUrl, '_blank')}
            className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            💬 Feedback
          </button>
        )}

        {/* Avatar Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getRoleColor(user?.role || '')} flex items-center justify-center text-white font-semibold text-sm`}>
              {user?.name ? getInitials(user.name) : '?'}
            </div>
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getRoleColor(user?.role || '')} flex items-center justify-center text-white font-semibold`}>
                      {user?.name ? getInitials(user.name) : '?'}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{user?.name}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {user?.role?.toLowerCase().replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50"
              >
                <span>{isUploading ? '⏳' : '📷'}</span>
                <span>{isUploading ? 'Mengupload...' : 'Upload Foto Profil'}</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <span>🚪</span>
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleProfilePhotoUpload}
        className="hidden"
      />
    </div>
  )
}
