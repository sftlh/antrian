'use client'

import React, { useState, useEffect } from 'react'
import { Users, Search, Phone, Mail, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
  idCardScan: string | null
}

interface Customer {
  id: string
  name: string
  npwp: string
  phone: string | null
  email: string | null
  interests: string | null
  contacts: Contact[]
}

export default function KontakPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchContacts = async (pageNumber: number, query: string = '') => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const url = new URL('/api/customers', window.location.origin)
      if (query) url.searchParams.append('q', query)
      url.searchParams.append('page', pageNumber.toString())
      url.searchParams.append('limit', '10')

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
        if (data.pagination) {
          setPage(data.pagination.page)
          setTotalPages(data.pagination.totalPages)
          setTotalItems(data.pagination.total)
        }
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchContacts(1, searchQuery)
  }

  useEffect(() => {
    fetchContacts(1)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontak Wajib Pajak</h1>
          <p className="text-gray-500 mt-1">Daftar lengkap data kontak dan PIC Wajib Pajak</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Cari berdasarkan Nama atau NPWP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Mencari...' : 'Cari'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          {customers.length > 0 ? (
             <>
                {customers.map((customer) => (
                  <div key={customer.id} className="border border-gray-200 rounded-xl p-5 bg-gray-50 hover:bg-gray-50/80 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          {customer.name}
                        </h3>
                        <p className="text-sm text-gray-500 font-mono mt-1">NPWP: {customer.npwp}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Wajib Pajak
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-100">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          Kontak Utama
                        </h4>
                        <dl className="text-sm space-y-2">
                          {customer.phone && (
                            <div className="flex gap-3">
                              <dt className="w-6 text-gray-400"><Phone size={16} /></dt>
                              <dd className="text-gray-700 font-medium">{customer.phone}</dd>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex gap-3">
                              <dt className="w-6 text-gray-400"><Mail size={16} /></dt>
                              <dd className="text-gray-700">{customer.email}</dd>
                            </div>
                          )}
                          {customer.interests && (
                            <div className="flex gap-3">
                              <dt className="w-6 text-gray-400"><FileText size={16} /></dt>
                              <dd className="text-gray-600">{customer.interests}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          Daftar PIC / Kontak ({customer.contacts?.length || 0})
                        </h4>
                        {customer.contacts && customer.contacts.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {customer.contacts.map((contact, idx) => (
                              <div key={contact.id || idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
                                <div className="font-bold text-gray-900 mb-1">{contact.name}</div>
                                <div className="text-gray-500 space-y-1 mb-2">
                                  {contact.phone && <div className="flex items-center gap-2"><Phone size={12} /> {contact.phone}</div>}
                                  {contact.email && <div className="flex items-center gap-2"><Mail size={12} /> {contact.email}</div>}
                                </div>
                                {contact.idCardScan && (
                                  <a 
                                    href={contact.idCardScan} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                  >
                                    <FileText size={12} />
                                    Lihat Scan KTP
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic bg-gray-100/50 p-4 rounded-lg text-center">
                            Tidak ada kontak tambahan terdaftar.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => fetchContacts(page - 1, searchQuery)}
                      disabled={page <= 1}
                      className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchContacts(page + 1, searchQuery)}
                      disabled={page >= totalPages}
                      className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Menampilkan <span className="font-medium">{Math.min(((page - 1) * 10) + 1, totalItems)}</span> sampai <span className="font-medium">{Math.min(page * 10, totalItems)}</span> dari <span className="font-medium">{totalItems}</span> hasil
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => fetchContacts(page - 1, searchQuery)}
                          disabled={page <= 1}
                          className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                          {page}
                        </span>

                        <button
                          onClick={() => fetchContacts(page + 1, searchQuery)}
                          disabled={page >= totalPages}
                          className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
             </>
          ) : (
             !isLoading && (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'Tidak ditemukan data Wajib Pajak dengan kata kunci tersebut.' : 'Belum ada data Wajib Pajak.'}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
