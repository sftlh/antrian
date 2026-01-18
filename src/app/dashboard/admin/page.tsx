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
      password: '' // Don't pre-fill password
    })
    setShowUserModal(true)
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
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage user accounts and permissions</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={fetchUsers}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    onClick={openCreateUserModal}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create User
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <li className="px-4 py-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first user.</p>
                  </li>
                ) : (
                  users.map((user) => (
                    <li key={user.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email} • {user.username}</div>
                          </div>
                          <div className="ml-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'RECEPTIONIST' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'HELPDESK' ? 'bg-green-100 text-green-800' :
                              user.role === 'TPT' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, !user.isActive)}
                            className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded ${
                              user.isActive
                                ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(user.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="HELPDESK">Helpdesk</option>
                    <option value="TPT">TPT</option>
                    <option value="KEPALA_SEKSI">Kepala Seksi</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
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

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Customer Management</h3>

            {/* CSV Upload Section */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Bulk Import Customers</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      disabled={isUploading}
                    />
                    <button
                      onClick={() => csvFile && handleCsvUpload(csvFile)}
                      disabled={!csvFile || isUploading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Uploading...' : 'Upload CSV'}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    CSV format: NPWP,Name,Interests (optional). First row should be headers.
                  </p>
                </div>

                {/* Upload Progress */}
                {isUploading && uploadProgress.total > 0 && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Processing customers...</span>
                      <span>{uploadProgress.processed}/{uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Upload Errors */}
                {uploadProgress.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h5 className="text-sm font-medium text-red-800 mb-2">Upload Errors:</h5>
                    <ul className="text-sm text-red-700 space-y-1">
                      {uploadProgress.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Customer List */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Recent Customers</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NPWP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interests
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers.slice(0, 10).map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {customer.npwp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.interests || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No customers found
                  </div>
                )}
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