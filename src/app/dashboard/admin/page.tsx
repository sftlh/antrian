'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface QueueStats {
  total: number
  waiting: number
  inProgress: number
  completed: number
  escalated: number
  cancelled: number
}

interface AnalyticsData {
  serviceDistribution: {
    HELPDESK: number
    TPT: number
    BOTH: number
  }
  priorityDistribution: {
    NORMAL: number
    HIGH: number
    URGENT: number
  }
  averageWaitTime: number
}

interface User {
  id: string
  username: string
  email: string
  name: string
  role: string
  additionalRoles?: string[]
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

interface Queue {
  id: string
  queueNumber: string
  serviceType: string
  status: string
  priorityLevel: string
  customer: {
    name: string
    npwp: string
    phone: string | null
  }
  calledByUser?: {
    id: string
    name: string
    role: string
  } | null
  escalatedToUser?: {
    id: string
    name: string
    role: string
  } | null
  createdAt: string
  calledAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  escalatedAt?: string | null
  escalatedReason?: string | null
}

interface Staff {
  id: string
  name: string
  role: string
}

interface UserFormData {
  username: string
  email: string
  name: string
  role: string
  additionalRoles?: string[]
  password: string
}

interface Customer {
  id: string
  npwp: string
  name: string
  interests?: string | null
  createdAt: string
}

interface UploadProgress {
  processed: number
  total: number
  errors: string[]
}

interface SystemSettings {
  businessHoursStart: string
  businessHoursEnd: string
  maxQueuesPerStaff: number
  autoAssignQueues: boolean
  escalationTimeout: number
}

// AdminPublicQueueDisplay component moved to /src/app/display/page.tsx

export default function AdminDashboard() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<QueueStats>({ total: 0, waiting: 0, inProgress: 0, completed: 0, escalated: 0, cancelled: 0 })
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    serviceDistribution: { HELPDESK: 0, TPT: 0, BOTH: 0 },
    priorityDistribution: { NORMAL: 0, HIGH: 0, URGENT: 0 },
    averageWaitTime: 0
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'queues' | 'customers' | 'settings' | 'public'>('overview')
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState<UserFormData>({
    username: '',
    email: '',
    name: '',
    role: 'RECEPTIONIST',
    additionalRoles: [],
    password: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queues, setQueues] = useState<Queue[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedQueues, setSelectedQueues] = useState<string[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<string>('')
  const [bulkValue, setBulkValue] = useState<string>('')
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ processed: 0, total: 0, errors: [] })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [settings, setSettings] = useState<SystemSettings>({
    businessHoursStart: '08:00',
    businessHoursEnd: '17:00',
    maxQueuesPerStaff: 10,
    autoAssignQueues: true,
    escalationTimeout: 30
  })

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchUsers()
      fetchStats()
      if (activeTab === 'queues') {
        fetchQueues()
      }
      if (activeTab === 'customers') {
        fetchCustomers()
      }
      if (activeTab === 'analytics') {
        fetchAnalytics()
      }
      if (activeTab === 'settings') {
        fetchSettings()
      }
    }

    // Auto-refresh real-time data
    const interval = setInterval(() => {
      if (user?.role === 'ADMIN') {
        fetchStats()
        if (activeTab === 'queues') {
          fetchQueues()
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [user, activeTab])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/customers?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, isActive }),
      })

      if (response.ok) {
        fetchUsers() // Refresh the user list
      }
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const result = await response.json()
        setMessage({ type: 'success', text: result.message })
        fetchUsers() // Refresh the user list
        setShowDeleteConfirm(null)
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to delete user' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      setMessage({ type: 'error', text: 'Failed to delete user' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const saveSettings = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const openCreateUserModal = () => {
    setEditingUser(null)
    setUserForm({
      username: '',
      email: '',
      name: '',
      role: 'RECEPTIONIST',
      additionalRoles: [],
      password: ''
    })
    setShowUserModal(true)
  }

  const openEditUserModal = (user: User) => {
    setEditingUser(user)
    setUserForm({
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      additionalRoles: user.additionalRoles || [],
      password: '' // Don't pre-fill password
    })
    setShowUserModal(true)
  }

  const handleRoleToggle = (roleToToggle: string) => {
    setUserForm(prev => {
      const currentAdditional = prev.additionalRoles || []
      let newAdditional

      if (currentAdditional.includes(roleToToggle)) {
        newAdditional = currentAdditional.filter(r => r !== roleToToggle)
      } else {
        newAdditional = [...currentAdditional, roleToToggle]
      }

      // If they check the main role, don't add to additional
      if (roleToToggle === prev.role) {
        newAdditional = newAdditional.filter(r => r !== roleToToggle)
      }

      return {
        ...prev,
        additionalRoles: newAdditional
      }
    })
  }

  const fetchQueues = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/queues', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQueues(data.queues)
        setStaff(data.staff)
      }
    } catch (error) {
      console.error('Failed to fetch queues:', error)
    }
  }

  const handleBulkAction = async (action: string, value: string) => {
    if (selectedQueues.length === 0) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/queues', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          queueIds: selectedQueues,
          staffId: action === 'reassign' ? value : undefined,
          priorityLevel: action === 'priority' ? value : undefined,
          status: action === 'status' ? value : undefined
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setMessage({ type: 'success', text: result.message })
        fetchQueues()
        fetchStats()
        setSelectedQueues([])
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to perform bulk action' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error)
      setMessage({ type: 'error', text: 'Failed to perform bulk action' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSingleQueueAction = async (queueId: string, action: string, value?: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/queues', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          queueIds: [queueId],
          staffId: action === 'reassign' ? value : undefined,
          priorityLevel: action === 'priority' ? value : undefined,
          status: action === 'status' ? value : undefined
        }),
      })

      if (response.ok) {
        fetchQueues()
        fetchStats()
        setMessage({ type: 'success', text: 'Queue updated successfully' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update queue' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to update queue:', error)
      setMessage({ type: 'error', text: 'Failed to update queue' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('auth_token')
      const url = editingUser ? `/api/admin/users` : '/api/admin/users'
      const method = editingUser ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userForm,
          userId: editingUser?.id
        }),
      })

      if (response.ok) {
        fetchUsers()
        setShowUserModal(false)
        setEditingUser(null)
        setUserForm({
          username: '',
          email: '',
          name: '',
          role: 'RECEPTIONIST',
          password: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save user')
      }
    } catch (error) {
      console.error('Failed to save user:', error)
      alert('Failed to save user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCsvUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress({ processed: 0, total: 0, errors: [] })

    try {
      const formData = new FormData()
      formData.append('csvFile', file)

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/customers/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setUploadProgress(result.progress)
        if (result.progress.errors.length === 0) {
          setMessage({ type: 'success', text: `Successfully imported ${result.progress.processed} customers` })
          fetchCustomers() // Refresh the customers list
        } else {
          setMessage({ type: 'error', text: `Imported ${result.progress.processed} customers with ${result.progress.errors.length} errors. Check the progress details.` })
        }
        setTimeout(() => setMessage(null), 5000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to upload CSV' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      setMessage({ type: 'error', text: 'Failed to upload CSV' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setIsUploading(false)
      setCsvFile(null)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.name} ({user.role})
              </div>
              <button
                onClick={() => {
                  logout()
                  router.push('/')
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('queues')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'queues'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Queue Management
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'customers'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Customers
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'public'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Public Display
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                        <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Waiting</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.waiting}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.inProgress}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.completed}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Escalated</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.escalated}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.cancelled}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 font-jakarta">User Management</h3>
                  <p className="mt-1 text-sm text-gray-500">Kelola akun pengguna, peran utama, dan hak akses tambahan sistem.</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={fetchUsers}
                    className="inline-flex items-center px-4 py-2.5 border border-gray-200 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow"
                  >
                    <svg className="mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                  <button
                    onClick={openCreateUserModal}
                    className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New User
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User Details</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Primary Role</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Additional Roles</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center border-b-0">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">No users found</h3>
                          <p className="mt-1 text-sm text-gray-500">Get started by creating your first user.</p>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors duration-150 group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-11 w-11">
                                <div className="h-full w-full rounded-full bg-gradient-to-tr from-indigo-100 to-blue-200 flex items-center justify-center border border-white shadow-sm">
                                  <span className="text-sm font-bold text-indigo-700">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{user.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{user.email} &bull; <span className="text-gray-400">@{user.username}</span></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                              user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              user.role === 'RECEPTIONIST' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              user.role === 'HELPDESK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              user.role === 'TPT' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              user.role === 'PETUGAS_SPT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                              {user.additionalRoles && user.additionalRoles.length > 0 ? (
                                user.additionalRoles.map((role) => (
                                  <span key={role} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200 shadow-sm">
                                    {role.replace('_', ' ')}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic px-1">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => openEditUserModal(user)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                title="Edit User"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => toggleUserStatus(user.id, !user.isActive)}
                                className={`p-1.5 rounded-lg transition-colors border border-transparent ${
                                  user.isActive
                                    ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                                }`}
                                title={user.isActive ? 'Deactivate User' : 'Activate User'}
                              >
                                {user.isActive ? (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(user.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                title="Delete User"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Queue Analytics</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Detailed analytics and performance metrics</p>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">📊</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <dt className="text-sm font-medium text-blue-600 truncate">Today&apos;s Queues</dt>
                          <dd className="text-2xl font-semibold text-blue-900">{stats.total}</dd>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">✅</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <dt className="text-sm font-medium text-green-600 truncate">Completion Rate</dt>
                          <dd className="text-2xl font-semibold text-green-900">
                            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                          </dd>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">⏱️</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <dt className="text-sm font-medium text-yellow-600 truncate">Avg Wait Time</dt>
                          <dd className="text-2xl font-semibold text-yellow-900">{analytics.averageWaitTime} min</dd>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Service Distribution</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">By Service Type</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">HELPDESK</span>
                            <span className="text-sm font-medium">{analytics.serviceDistribution.HELPDESK}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">TPT</span>
                            <span className="text-sm font-medium">{analytics.serviceDistribution.TPT}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">BOTH</span>
                            <span className="text-sm font-medium">{analytics.serviceDistribution.BOTH}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">By Priority</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Normal</span>
                            <span className="text-sm font-medium">{analytics.priorityDistribution.NORMAL}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">High</span>
                            <span className="text-sm font-medium">{analytics.priorityDistribution.HIGH}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Urgent</span>
                            <span className="text-sm font-medium">{analytics.priorityDistribution.URGENT}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Queue Management Tab */}
          {activeTab === 'queues' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Advanced Queue Management</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Global queue override and bulk operations</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={fetchQueues}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      🔄 Refresh
                    </button>
                    {selectedQueues.length > 0 && (
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        ⚡ Bulk Actions ({selectedQueues.length})
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-4 py-5 sm:p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                            <input
                              type="checkbox"
                              className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                              checked={selectedQueues.length === queues.length && queues.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQueues(queues.map(q => q.id))
                                } else {
                                  setSelectedQueues([])
                                }
                              }}
                            />
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Queue
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {queues.map((queue) => (
                          <tr key={queue.id} className={selectedQueues.includes(queue.id) ? 'bg-indigo-50' : ''}>
                            <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                              <input
                                type="checkbox"
                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                                checked={selectedQueues.includes(queue.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedQueues([...selectedQueues, queue.id])
                                  } else {
                                    setSelectedQueues(selectedQueues.filter(id => id !== queue.id))
                                  }
                                }}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`font-bold text-xl ${
                                  queue.priorityLevel === 'URGENT' ? 'text-red-600' :
                                  queue.priorityLevel === 'HIGH' ? 'text-yellow-600' :
                                  'text-indigo-600'
                                }`}>
                                  {queue.queueNumber}
                                  {queue.priorityLevel === 'URGENT' && <span className="ml-1">🚨</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{queue.customer.name}</div>
                              <div className="text-sm text-gray-500">{queue.customer.npwp}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                queue.serviceType === 'HELPDESK' ? 'bg-blue-100 text-blue-800' :
                                queue.serviceType === 'TPT' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {queue.serviceType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                queue.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
                                queue.status === 'CALLED' ? 'bg-blue-100 text-blue-800' :
                                queue.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                                queue.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                queue.status === 'ESCALATED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {queue.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {queue.calledByUser ? (
                                <div>
                                  <div className="font-medium">{queue.calledByUser.name}</div>
                                  <div className="text-xs text-gray-400">{queue.calledByUser.role}</div>
                                </div>
                              ) : queue.escalatedToUser ? (
                                <div>
                                  <div className="font-medium text-red-600">{queue.escalatedToUser.name}</div>
                                  <div className="text-xs text-red-400">{queue.escalatedToUser.role} (Escalated)</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Unassigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <select
                                onChange={(e) => {
                                  const [action, value] = e.target.value.split(':')
                                  if (action && value) {
                                    handleSingleQueueAction(queue.id, action, value)
                                  }
                                  e.target.value = ''
                                }}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs"
                                defaultValue=""
                              >
                                <option value="">Quick Actions</option>
                                <optgroup label="Reassign">
                                  {staff.map((member) => (
                                    <option key={member.id} value={`reassign:${member.id}`}>
                                      Assign to {member.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Priority">
                                  <option value="priority:NORMAL">Set Normal</option>
                                  <option value="priority:HIGH">Set High</option>
                                  <option value="priority:URGENT">Set Urgent</option>
                                </optgroup>
                                <optgroup label="Status">
                                  <option value="status:COMPLETED">Mark Complete</option>
                                  <option value="status:CANCELLED">Cancel Queue</option>
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {queues.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No queues found</h3>
                      <p className="mt-1 text-sm text-gray-500">All queues have been processed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">System Settings</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Configure system behavior and business rules</p>
                </div>
                <div className="px-4 py-5 sm:p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Hours</label>
                      <div className="mt-1 flex space-x-2">
                        <input
                          type="time"
                          value={settings.businessHoursStart}
                          onChange={(e) => setSettings({ ...settings, businessHoursStart: e.target.value })}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <span className="self-center text-gray-500">to</span>
                        <input
                          type="time"
                          value={settings.businessHoursEnd}
                          onChange={(e) => setSettings({ ...settings, businessHoursEnd: e.target.value })}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Queues per Staff</label>
                      <input
                        type="number"
                        value={settings.maxQueuesPerStaff}
                        onChange={(e) => setSettings({ ...settings, maxQueuesPerStaff: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Auto-assign Queues</label>
                      <select
                        value={settings.autoAssignQueues ? 'enabled' : 'disabled'}
                        onChange={(e) => setSettings({ ...settings, autoAssignQueues: e.target.value === 'enabled' })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Escalation Timeout (minutes)</label>
                      <input
                        type="number"
                        value={settings.escalationTimeout}
                        onChange={(e) => setSettings({ ...settings, escalationTimeout: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveSettings}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Public Display Tab */}
          {activeTab === 'public' && (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Tampilan Publik Antrian</h2>
              <p className="text-gray-600 mb-6">
                Halaman tampilan publik telah dipindahkan ke halaman terpisah agar dapat diakses tanpa login.
              </p>
              <Link
                href="/display"
                target="_blank"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="mr-2">📺</span>
                Buka Tampilan Publik
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="relative w-full max-w-md shadow-2xl rounded-2xl bg-white border border-gray-100 transform transition-all">
            <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 font-jakarta">
                {editingUser ? 'Edit User Configuration' : 'Create New System User'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-all bg-gray-50 focus:bg-white"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                    <input
                      type="text"
                      required
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-all bg-gray-50 focus:bg-white"
                      placeholder="johndoe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-all bg-gray-50 focus:bg-white"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-all bg-gray-50 focus:bg-white text-gray-900"
                  >
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="HELPDESK">Helpdesk</option>
                    <option value="TPT">TPT</option>
                    <option value="KEPALA_SEKSI">Kepala Seksi</option>
                    <option value="PETUGAS_SPT">Petugas SPT</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Peran Tambahan (Opsional)</label>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Multi-Role</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50/50 shadow-inner">
                    {['RECEPTIONIST', 'HELPDESK', 'TPT', 'KEPALA_SEKSI', 'PETUGAS_SPT', 'ADMIN'].map((roleOpt) => (
                      <label key={roleOpt} className="flex items-center p-2 border border-gray-100 rounded-lg hover:bg-white bg-transparent transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          id={`role-${roleOpt}`}
                          checked={userForm.additionalRoles?.includes(roleOpt) || false}
                          onChange={() => handleRoleToggle(roleOpt)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-all"
                        />
                        <span className="ml-2.5 block text-xs font-medium text-gray-700 group-hover:text-indigo-700">
                          {roleOpt.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Centang peran lain yang dapat dipilih pengguna saat login.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                    <span>Password</span>
                    {editingUser && <span className="text-xs text-gray-400 font-normal italic">(Kosongkan jika tidak ingin diubah)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2.5 transition-all bg-gray-50 focus:bg-white"
                    placeholder={editingUser ? "••••••••" : "Enter a secure password"}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (editingUser ? 'Update User' : 'Create User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Actions</h3>
              <p className="text-sm text-gray-500 mb-4">
                Apply action to {selectedQueues.length} selected queue{selectedQueues.length !== 1 ? 's' : ''}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reassign to Staff</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction('reassign', e.target.value)
                        setShowBulkModal(false)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    defaultValue=""
                  >
                    <option value="">Select staff member...</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Set Priority</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction('priority', e.target.value)
                        setShowBulkModal(false)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    defaultValue=""
                  >
                    <option value="">Select priority...</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction('status', e.target.value)
                        setShowBulkModal(false)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    defaultValue=""
                  >
                    <option value="">Select status...</option>
                    <option value="COMPLETED">Mark as Completed</option>
                    <option value="CANCELLED">Cancel Queues</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      ﻿            {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-6 max-w-[95%] lg:max-w-7xl mx-auto py-8">
          <div className="bg-white shadow-2xl shadow-indigo-100/50 rounded-3xl overflow-hidden border border-slate-100 ring-1 ring-slate-900/5">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-900 px-6 py-8 sm:px-10 sm:py-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-20">
                 <svg width="400" height="400" fill="none" viewBox="0 0 400 400"><defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 40V0h40v40H0z" fill="url(#p-grad)"/><path d="M0 0h40v40H0V0z" stroke="#fff" strokeWidth="2" fill="none"/></pattern><linearGradient id="p-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#fff" stopOpacity="0.2"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/></linearGradient></defs><rect width="400" height="400" fill="url(#p)"/></svg>
              </div>
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center shadow-sm">
                    <div className="bg-white/10 p-3 rounded-2xl mr-5 backdrop-blur-md shadow-inner border border-white/20">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    Customer Management
                  </h3>
                  <p className="text-indigo-100 text-base sm:text-lg mt-4 ml-[72px] font-medium max-w-2xl leading-relaxed">Kelola pendaftaran wajib pajak, bulk upload data CSV, dan pantau histori dengan antarmuka modern yang terintegrasi.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 sm:p-10 bg-slate-50/80">
              {/* CSV Upload Section */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 mb-10 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 p-3.5 rounded-2xl border border-blue-100/50 shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800">Bulk Import Customers</h4>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Upload massa data wajib pajak dalam format CSV ke dalam sistem antrian.</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-indigo-700 bg-indigo-50/80 px-4 py-2.5 rounded-xl border border-indigo-100/50 font-semibold whitespace-nowrap shadow-sm">
                    <svg className="w-4 h-4 mr-2.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>Format: <span className="font-bold font-mono tracking-tight bg-white px-2 py-0.5 rounded shadow-sm ml-1 text-slate-700">NPWP, Name, Interests</span></span>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
                    <div className="lg:col-span-3 relative group">
                      <div className="absolute inset-0 bg-blue-50/30 rounded-2xl border-2 border-dashed border-blue-200 group-hover:border-blue-400 group-hover:bg-blue-50/80 transition-all duration-300 z-0 pointer-events-none"></div>
                      <div className="relative z-10 p-2.5">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="block w-full text-base text-slate-600 file:mr-6 file:py-3.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:transition-colors cursor-pointer bg-transparent transition-all focus:outline-none focus:ring-4 focus:ring-blue-100 focus:rounded-xl"
                          disabled={isUploading}
                        />
                      </div>
                    </div>
                    <div className="lg:col-span-1">
                      <button
                        onClick={() => csvFile && handleCsvUpload(csvFile)}
                        disabled={!csvFile || isUploading}
                        className="w-full flex justify-center items-center px-6 py-4 border border-transparent text-sm md:text-base font-bold rounded-2xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                      >
                        {isUploading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            Mulai Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && uploadProgress.total > 0 && (
                  <div className="mt-8 bg-blue-50/50 border border-blue-100 p-6 rounded-2xl shadow-inner">
                    <div className="flex justify-between items-center text-sm font-bold text-indigo-900 mb-4">
                      <span className="flex items-center text-base">
                        <svg className="animate-spin mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Memproses Data CSV...
                      </span>
                      <span className="bg-white text-blue-800 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm font-mono">{uploadProgress.processed} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-4 overflow-hidden shadow-inner border border-slate-200 p-0.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300 relative"
                        style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Errors */}
                {uploadProgress.errors.length > 0 && (
                  <div className="mt-8 bg-gradient-to-b from-red-50 to-white border border-red-200 rounded-2xl p-6 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-bl-full -z-0 opacity-50"></div>
                    <div className="flex items-center mb-4 pb-4 border-b border-red-100 relative z-10">
                      <div className="bg-white p-2.5 rounded-xl mr-4 border border-red-100 shadow-sm text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      </div>
                      <div>
                        <h5 className="text-lg font-bold text-red-800">Ditemukan {uploadProgress.errors.length} Error</h5>
                        <p className="text-sm text-red-600 font-medium">Beberapa baris tidak dapat diproses</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-red-100 p-4 shadow-inner relative z-10">
                       <ul className="text-sm font-medium text-red-700 space-y-2 list-disc list-inside max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                         {uploadProgress.errors.map((error, index) => (
                           <li key={index} className="pb-2 border-b border-red-50 last:border-0 last:pb-0">{error.replace('• ', '')}</li>
                         ))}
                       </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer List */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden transition-shadow duration-300 hover:shadow-md">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -z-0 pointer-events-none opacity-60"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-indigo-100 to-blue-50 p-3.5 rounded-2xl mr-5 border border-indigo-100 shadow-sm">
                      <svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-extrabold text-slate-800">Recent Customers Data</h4>
                      <p className="text-sm font-medium text-slate-500 mt-1">10 Data pendaftar terbaru dalam sistem</p>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-0">
                    <span className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                      <span className="relative flex h-3 w-3 mr-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      Real-time Feed
                    </span>
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative z-10 bg-slate-50/50">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-100/80">
                        <tr>
                          <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Wajib Pajak</th>
                          <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">NPWP</th>
                          <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Keperluan Layanan</th>
                          <th className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Waktu Registrasi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {customers.slice(0, 10).map((customer) => (
                          <tr key={customer.id} className="hover:bg-blue-50/40 transition-colors group">
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-bold text-lg mr-4 border border-indigo-200 shadow-sm group-hover:scale-105 transition-transform">
                                  {customer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{customer.name}</div>
                                  <div className="text-xs text-slate-400 font-medium mt-0.5">ID: {customer.id.substring(0,8)}...</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="inline-flex items-center px-3 py-1.5 rounded-lg justify-center text-sm font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                                {customer.npwp}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              {customer.interests ? (
                                <span className="px-4 py-2 inline-flex text-xs leading-5 font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                                  {customer.interests}
                                </span>
                              ) : (
                                <span className="px-4 py-2 inline-flex text-xs leading-5 font-medium rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                                  Belum Ditentukan
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right">
                              <div className="text-sm text-slate-700 font-semibold">
                                {new Date(customer.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric'})}
                              </div>
                              <div className="text-xs text-slate-400 font-medium mt-1">
                                {new Date(customer.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }).replace('.', ':')} WIB
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {customers.length === 0 && (
                    <div className="text-center py-20 bg-white">
                      <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-slate-50 text-slate-300 mb-6 border-2 border-dashed border-slate-200 shadow-inner">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">Database Kosong</h3>
                      <p className="mt-3 text-base text-slate-500 max-w-md mx-auto font-medium leading-relaxed">Belum ada wajib pajak yang terdaftar dalam sistem. Silakan upload data CSV untuk memulai.</p>
                      <button 
                        onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                        className="mt-6 inline-flex justify-center items-center px-6 py-3 border border-slate-200 shadow-sm text-sm font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Pilih File CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete User</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(showDeleteConfirm)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {message && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-md text-white ${
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  )
}


