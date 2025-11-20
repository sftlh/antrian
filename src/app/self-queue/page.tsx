'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormData {
  hasNpwp: boolean | null
  npwp: string
  name: string
  interests: string
  phone: string
  email: string
  serviceType: string
  serviceOrder: 'HELPDESK_FIRST' | 'TPT_FIRST' | ''
}

export default function SelfQueuePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    hasNpwp: null,
    npwp: '',
    name: '',
    interests: '',
    phone: '',
    email: '',
    serviceType: '',
    serviceOrder: ''
  })
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [queueInfo, setQueueInfo] = useState<{
    queues: Array<{ queueNumber: string; serviceType: string; serviceOrder?: string; isPlaceholder?: boolean }>;
    name: string;
  } | null>(null)

  const handleNpwpLookup = async () => {
    if (!formData.npwp || formData.npwp.length !== 15) {
      setError('NPWP harus 15 digit')
      return
    }

    setLookupLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/self-queue/lookup?npwp=${formData.npwp}`)
      const data = await response.json()

      if (data.found) {
        setFormData(prev => ({
          ...prev,
          name: data.customer.name || '',
          interests: data.customer.interests || '',
          phone: data.customer.phone || '',
          email: data.customer.email || ''
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          name: '',
          interests: '',
          phone: '',
          email: ''
        }))
      }
    } catch (err) {
      console.error('Lookup error:', err)
      setError('Gagal mencari data NPWP')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (formData.hasNpwp === null) {
      setError('Silakan pilih apakah Anda memiliki NPWP atau tidak')
      setLoading(false)
      return
    }

    if (formData.hasNpwp && (!formData.npwp || formData.npwp.length !== 15)) {
      setError('NPWP harus 15 digit')
      setLoading(false)
      return
    }

    if (!formData.name) {
      setError('Nama wajib diisi')
      setLoading(false)
      return
    }

    if (!formData.serviceType) {
      setError('Silakan pilih jenis layanan')
      setLoading(false)
      return
    }

    if (formData.serviceType === 'BOTH' && !formData.serviceOrder) {
      setError('Silakan pilih urutan layanan')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/self-queue/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasNpwp: formData.hasNpwp,
          npwp: formData.npwp,
          name: formData.name,
          interests: formData.interests,
          phone: formData.phone,
          email: formData.email,
          serviceType: formData.serviceType,
          serviceOrder: formData.serviceOrder
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendaftar antrian')
      }

      const queues = data.queues || [{ queueNumber: data.queueNumber, serviceType: data.serviceType, serviceOrder: data.serviceOrder }]

      setQueueInfo({
        queues,
        name: data.customer.name
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mendaftar')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      hasNpwp: null,
      npwp: '',
      name: '',
      interests: '',
      phone: '',
      email: '',
      serviceType: '',
      serviceOrder: ''
    })
    setSuccess(false)
    setQueueInfo(null)
    setError('')
  }

  const getServiceTypeText = (type: string, serviceOrder?: string) => {
    switch (type) {
      case 'HELPDESK': return 'Helpdesk'
      case 'TPT': return 'TPT (Tempat Pelayanan Terpadu)'
      case 'BOTH': 
        // For display purposes, show the first service
        return serviceOrder === 'TPT_FIRST' ? 'TPT (Tempat Pelayanan Terpadu)' : 'Helpdesk'
      default: return type
    }
  }

  if (success && queueInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <style jsx>{`
              @media print {
                .no-print { display: none; }
                .print-card { 
                  box-shadow: none; 
                  border: 1px solid #000; 
                  page-break-inside: avoid;
                  margin-bottom: 20px;
                }
                .placeholder-card {
                  border: 2px dashed #666 !important;
                  background: #f5f5f5 !important;
                }
                body { background: white; } 
              }
            `}</style>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Pendaftaran Berhasil!</h1>
            <p className="text-gray-600 mb-8">Nomor antrian Anda telah dibuat</p>

            {queueInfo.queues.map((queue, index) => (
              <div key={index} className={`rounded-xl p-8 mb-8 print-card ${
                queue.isPlaceholder 
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-dashed border-gray-300 placeholder-card' 
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
              }`}>
                <p className={`text-sm mb-2 ${queue.isPlaceholder ? 'text-gray-200' : 'text-white'}`}>
                  {queue.serviceType === 'BOTH' && queue.serviceOrder ? 
                    (queue.serviceOrder === 'HELPDESK_FIRST' ? 
                      'Antrian Pertama - Helpdesk' : 
                      'Antrian Pertama - TPT'
                    ) : 
                    'Nomor Antrian Anda'
                  }
                  {queue.isPlaceholder && ' (Akan dibuat setelah layanan pertama selesai)'}
                </p>
                <p className={`text-6xl font-bold mb-4 ${queue.isPlaceholder ? 'text-gray-100' : 'text-white'}`}>
                  {queue.queueNumber}
                </p>
                <p className={queue.isPlaceholder ? 'text-gray-200' : 'text-blue-100'}>
                  {queueInfo.name}
                </p>
                <p className={`text-sm mt-2 ${queue.isPlaceholder ? 'text-gray-200' : 'text-blue-100'}`}>
                  {getServiceTypeText(queue.serviceType, queue.serviceOrder)}
                </p>
                {queue.serviceOrder && (
                  <p className={`text-xs mt-1 ${queue.isPlaceholder ? 'text-gray-300' : 'text-blue-100'}`}>
                    Layanan pertama dari urutan {queue.serviceOrder === 'HELPDESK_FIRST' ? 'Helpdesk → TPT' : 'TPT → Helpdesk'}
                  </p>
                )}
              </div>
            ))}

            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Petunjuk:</h3>
              <ul className="text-left text-gray-700 space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Harap tunggu nomor antrian pertama Anda dipanggil</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Pantau layar display untuk melihat nomor antrian yang sedang dilayani</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Jika nomor pertama Anda dipanggil, segera menuju ke loket yang ditunjuk</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Setelah layanan pertama selesai, antrian akan otomatis dilanjutkan ke layanan kedua</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Simpan nomor antrian ini untuk referensi</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-4 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Print Kartu Antrian
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Daftar Antrian Baru
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">KPP</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pendaftaran Antrian Mandiri</h1>
                <p className="text-sm text-gray-600">Kantor Pelayanan Pajak Madya Dua Surabaya</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* NPWP Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Apakah Anda memiliki NPWP?
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hasNpwp: true, npwp: '' }))}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                    formData.hasNpwp === true
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Ya, saya punya NPWP
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hasNpwp: false, npwp: '' }))}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                    formData.hasNpwp === false
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Tidak ada NPWP
                </button>
              </div>
            </div>

            {/* NPWP Input (only if has NPWP) */}
            {formData.hasNpwp === true && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor NPWP (15 digit)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.npwp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setFormData(prev => ({ ...prev, npwp: value }))
                    }}
                    placeholder="Contoh: 123456789012345"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleNpwpLookup}
                    disabled={lookupLoading || formData.npwp.length !== 15}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {lookupLoading ? 'Mencari...' : 'Cari'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Masukkan NPWP Anda dan klik Cari untuk mengisi data otomatis
                </p>
              </div>
            )}

            {/* Name Input */}
            {formData.hasNpwp !== null && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keperluan
                  </label>
                  <textarea
                    value={formData.interests}
                    onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                    placeholder="Jelaskan keperluan Anda (opsional)"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Contoh: 081234567890 (opsional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Contoh: email@example.com (opsional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Service Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pilih Jenis Layanan <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, serviceType: 'HELPDESK', serviceOrder: '' }))}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        formData.serviceType === 'HELPDESK'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Helpdesk</div>
                          <div className="text-sm text-gray-600">Informasi umum dan bantuan layanan pajak</div>
                        </div>
                        {formData.serviceType === 'HELPDESK' && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, serviceType: 'TPT', serviceOrder: '' }))}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        formData.serviceType === 'TPT'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">TPT (Tempat Pelayanan Terpadu)</div>
                          <div className="text-sm text-gray-600">Bantuan teknis untuk proses, sistem, dan prosedur pajak</div>
                        </div>
                        {formData.serviceType === 'TPT' && (
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, serviceType: 'BOTH', serviceOrder: '' }))}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        formData.serviceType === 'BOTH'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Keduanya (Helpdesk & TPT)</div>
                          <div className="text-sm text-gray-600">Saya memerlukan bantuan dari kedua layanan</div>
                        </div>
                        {formData.serviceType === 'BOTH' && (
                          <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Service Order Selection (only for BOTH) */}
                {formData.serviceType === 'BOTH' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Pilih Urutan Layanan <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceOrder: 'HELPDESK_FIRST' }))}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          formData.serviceOrder === 'HELPDESK_FIRST'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">Helpdesk dulu, lalu TPT</div>
                            <div className="text-sm text-gray-600">Informasi umum terlebih dahulu, kemudian bantuan teknis</div>
                          </div>
                          {formData.serviceOrder === 'HELPDESK_FIRST' && (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceOrder: 'TPT_FIRST' }))}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          formData.serviceOrder === 'TPT_FIRST'
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">TPT dulu, lalu Helpdesk</div>
                            <div className="text-sm text-gray-600">Bantuan teknis terlebih dahulu, kemudian informasi umum</div>
                          </div>
                          {formData.serviceOrder === 'TPT_FIRST' && (
                            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            {formData.hasNpwp !== null && (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Memproses...' : 'Daftar Antrian'}
                </button>
              </div>
            )}
          </form>
        </div>


      </div>
    </div>
  )
}
