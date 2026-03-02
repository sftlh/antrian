import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  username: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string, selectedRole?: string) => Promise<{success: boolean; requiresRoleSelection?: boolean; availableRoles?: string[]; error?: string}>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('auth_token')
    if (token) {
      // Verify token with server
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        } else {
          localStorage.removeItem('auth_token')
        }
      })
      .catch(() => {
        localStorage.removeItem('auth_token')
      })
      .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (username: string, password: string, selectedRole?: string): Promise<{success: boolean; requiresRoleSelection?: boolean; availableRoles?: string[]; error?: string}> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, selectedRole }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requiresRoleSelection) {
          return { success: false, requiresRoleSelection: true, availableRoles: data.availableRoles }
        }

        if (data.token) {
          localStorage.setItem('auth_token', data.token)
          setUser(data.user)
          return { success: true }
        }
      }

      return { success: false, error: data.error || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    // Optional: Call logout API for server-side cleanup
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}