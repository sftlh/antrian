'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { User, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'

export default function Home() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requiresRoleSelection, setRequiresRoleSelection] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const { login, user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect based on role
      switch (user.role) {
        case 'ADMIN':
          router.push('/dashboard/admin')
          break
        case 'RECEPTIONIST':
          router.push('/dashboard/receptionist')
          break
        case 'HELPDESK':
          router.push('/dashboard/helpdesk')
          break
        case 'TPT':
          router.push('/dashboard/tpt')
          break
        case 'KEPALA_SEKSI':
          router.push('/dashboard/kepala-seksi')
          break
        case 'PETUGAS_SPT':
          router.push('/dashboard/petugas-spt')
          break
        default:
          router.push('/dashboard')
      }
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(username, password)

      if (result.requiresRoleSelection) {
        setRequiresRoleSelection(true)
        setAvailableRoles(result.availableRoles || [])
      } else if (!result.success) {
        setError(result.error || 'Username atau password salah')
      }
      // Redirect will happen via useEffect when user state updates
    } catch (err) {
      setError('Terjadi kesalahan saat login')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = async (role: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await login(username, password, role)
      if (!result.success) {
        setError(result.error || 'Gagal memilih role')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memilih role')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-emerald-500/20 animate-gradient-xy"></div>
        <div className="text-center relative z-10 p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 font-medium tracking-wide">Membuat sambungan aman...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-emerald-500/20"></div>
        <div className="text-center relative z-10 p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 font-medium tracking-wide">Mengalihkan ke dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md relative z-10 px-6">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-300">
               <ShieldCheck className="w-9 h-9 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
              NAWAITU
            </h2>
            <div className="mt-2 h-1 w-12 bg-emerald-500/50 rounded-full mx-auto"></div>
            <p className="mt-4 text-sm text-slate-500 font-medium">
              Nagawa Antrian Untukmu
              <br/>
              <span className="text-xs text-slate-400 font-normal">KPP Madya Dua Surabaya</span>
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-10">
            {requiresRoleSelection ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-slate-500 mb-1">Berhasil Masuk</p>
                  <h3 className="text-lg font-bold text-slate-800">Pilih Peran Anda</h3>
                </div>
                
                {error && (
                  <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 mb-4">
                    <div className="h-2 w-2 bg-red-500 rounded-full mr-3 shrink-0"></div>
                    {error}
                  </div>
                )}

                <div className="grid gap-3">
                  {availableRoles.map((r) => (
                    <button
                      key={r}
                      onClick={(e) => {
                        e.preventDefault();
                        handleRoleSelect(r);
                      }}
                      disabled={loading}
                      className="w-full relative flex items-center justify-between py-3.5 px-5 border border-emerald-100 rounded-xl bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-200 text-emerald-800 font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden"
                    >
                      <span className="flex items-center">
                        <User className="w-5 h-5 mr-3 text-emerald-500 opacity-70" />
                        {r.replace(/_/g, ' ')}
                      </span>
                      <ArrowRight className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all" />
                    </button>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setRequiresRoleSelection(false);
                    setPassword('');
                  }}
                  disabled={loading}
                  className="w-full mt-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="group">
                  <label htmlFor="username" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all duration-200 sm:text-sm"
                      placeholder="Masukkan ID Pengguna"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all duration-200 sm:text-sm"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
                  <div className="h-2 w-2 bg-red-500 rounded-full mr-3 shrink-0"></div>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    Memproses...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Masuk Sekarang
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>
            )}
          </div>

          {/* Footer Decor */}
          <div className="bg-slate-50/50 border-t border-slate-100 p-4 text-center">
             <p className="text-xs text-slate-400">
               © {new Date().getFullYear()} Sistem Antrian Pelayanan Pajak
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
