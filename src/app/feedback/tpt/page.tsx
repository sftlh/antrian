'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  npwp: string;
  interests: string;
}

interface Queue {
  id: string;
  queueNumber: string;
  status: string;
  customer: Customer;
  serviceType: string;
  createdAt: string;
}

export default function TPTFeedbackPage() {
  const router = useRouter();
  const [currentQueue, setCurrentQueue] = useState<Queue | null>(null);
  const [lastCompletedQueue, setLastCompletedQueue] = useState<Queue | null>(null);
  const [serviceCompleted, setServiceCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [neatnessRating, setNeatnessRating] = useState<number>(0);
  const [materialMasteryRating, setMaterialMasteryRating] = useState<number>(0);
  const [communicationRating, setCommunicationRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check for current TPT customer and service status
  useEffect(() => {
    const checkCurrentState = async () => {
      try {
        // Check if there's a current queue being served by TPT
        const savedCurrentQueue = localStorage.getItem('tpt_current_queue');
        const savedServiceCompleted = localStorage.getItem('tpt_service_completed');

        if (savedCurrentQueue) {
          const queue = JSON.parse(savedCurrentQueue);
          setCurrentQueue(queue);
          if (savedServiceCompleted === 'true') {
            setLastCompletedQueue(queue);
          }
        } else {
          setCurrentQueue(null);
        }

        setServiceCompleted(savedServiceCompleted === 'true');
      } catch (err) {
        console.error('Error checking current state:', err);
        setError('Terjadi kesalahan saat memuat data');
      } finally {
        setIsLoading(false);
      }
    };

    checkCurrentState();

    // Listen for storage changes to update in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tpt_current_queue') {
        if (e.newValue) {
          try {
            const queue = JSON.parse(e.newValue);
            setCurrentQueue(queue);
            setIsSubmitted(false); // Reset to show customer data when next is called
          } catch (err) {
            setCurrentQueue(null);
          }
        } else {
          setCurrentQueue(null);
        }
      } else if (e.key === 'tpt_service_completed') {
        const newCompleted = e.newValue === 'true';
        setServiceCompleted(newCompleted);
        // When service is completed, store the current queue as last completed
        if (newCompleted && currentQueue) {
          setLastCompletedQueue(currentQueue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for changes every 2 seconds as a fallback
    const pollInterval = setInterval(() => {
      const savedCurrentQueue = localStorage.getItem('tpt_current_queue');
      const savedServiceCompleted = localStorage.getItem('tpt_service_completed');

      let queueChanged = false;
      let completionChanged = false;

        if (savedCurrentQueue) {
          try {
            const queue = JSON.parse(savedCurrentQueue);
            if (JSON.stringify(queue) !== JSON.stringify(currentQueue)) {
              setCurrentQueue(queue);
              queueChanged = true;
              setIsSubmitted(false); // Reset to show customer data
              // Reset all form fields for new customer
              setRating(0);
              setNeatnessRating(0);
              setMaterialMasteryRating(0);
              setCommunicationRating(0);
              setComment('');
              setError('');
            }
          } catch (err) {
            if (currentQueue !== null) {
              setCurrentQueue(null);
              queueChanged = true;
              // Reset form fields when no queue
              setRating(0);
              setNeatnessRating(0);
              setMaterialMasteryRating(0);
              setCommunicationRating(0);
              setComment('');
              setError('');
            }
          }
        } else if (currentQueue !== null) {
          setCurrentQueue(null);
          queueChanged = true;
          // Reset form fields when no queue
          setRating(0);
          setNeatnessRating(0);
          setMaterialMasteryRating(0);
          setCommunicationRating(0);
          setComment('');
          setError('');
        }      const newServiceCompleted = savedServiceCompleted === 'true';
      if (newServiceCompleted !== serviceCompleted) {
        setServiceCompleted(newServiceCompleted);
        completionChanged = true;
        // When service is completed via polling, store the current queue as last completed
        if (newServiceCompleted && currentQueue) {
          setLastCompletedQueue(currentQueue);
        }
      }

      // Log changes for debugging
      if (queueChanged || completionChanged) {
        console.log('TPT Feedback page state updated:', {
          queueChanged,
          completionChanged,
          currentQueue: savedCurrentQueue ? JSON.parse(savedCurrentQueue).queueNumber : null,
          serviceCompleted: newServiceCompleted
        });
      }
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [currentQueue, serviceCompleted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const queueForFeedback = serviceCompleted ? lastCompletedQueue : currentQueue;

    if (!queueForFeedback || rating === 0 || neatnessRating === 0 || materialMasteryRating === 0 || communicationRating === 0) {
      setError('Silakan berikan semua rating yang diperlukan');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/queues/${queueForFeedback.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          neatnessRating,
          materialMasteryRating,
          communicationRating,
          comment: comment.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengirim feedback');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError('Terjadi kesalahan saat mengirim feedback');
      console.error('Feedback submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (error && !isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h1>
            <p className="text-gray-600">Feedback Anda telah berhasil dikirim. Layanan kami akan terus berusaha memberikan pelayanan yang lebih baik.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show feedback form if service is completed, otherwise show current customer or no customer message
  const queueToShow = serviceCompleted ? lastCompletedQueue : currentQueue;

  if (!queueToShow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loket TPT</h1>
            <p className="text-gray-600 text-lg">
              Saat ini tidak ada pelanggan yang sedang dilayani di loket TPT.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show feedback form when service is completed
  if (serviceCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Penilaian Layanan TPT</h1>
            {queueToShow && (
              <div className="mb-4">
                <div className="text-lg font-semibold text-gray-800">
                  {queueToShow.customer.name}
                </div>
                <div className="text-sm text-gray-600">
                  Nomor Antrian: {queueToShow.queueNumber}
                </div>
              </div>
            )}
            <p className="text-gray-600 text-lg">
              Bagaimana pengalaman Anda dengan layanan teknis pajak hari ini?
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-center font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Rating Section */}
            <div>
              <label className="block text-xl font-semibold text-gray-900 mb-4 text-center">
                Rating Keseluruhan
              </label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-16 h-16 rounded-full border-2 transition-all ${
                      rating >= star
                        ? 'bg-yellow-400 border-yellow-400 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="text-center mt-4">
                <span className="text-lg text-gray-600">
                  {rating === 0 && 'Pilih rating Anda'}
                  {rating === 1 && 'Sangat Buruk'}
                  {rating === 2 && 'Buruk'}
                  {rating === 3 && 'Cukup'}
                  {rating === 4 && 'Baik'}
                  {rating === 5 && 'Sangat Baik'}
                </span>
              </div>
            </div>

            {/* Neatness Rating Section */}
            <div>
              <label className="block text-xl font-semibold text-gray-900 mb-4 text-center">
                Kerapian Pegawai
              </label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNeatnessRating(star)}
                    className={`w-16 h-16 rounded-full border-2 transition-all ${
                      neatnessRating >= star
                        ? 'bg-blue-400 border-blue-400 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="text-center mt-4">
                <span className="text-lg text-gray-600">
                  {neatnessRating === 0 && 'Pilih rating kerapian pegawai'}
                  {neatnessRating === 1 && 'Sangat Buruk'}
                  {neatnessRating === 2 && 'Buruk'}
                  {neatnessRating === 3 && 'Cukup'}
                  {neatnessRating === 4 && 'Baik'}
                  {neatnessRating === 5 && 'Sangat Baik'}
                </span>
              </div>
            </div>

            {/* Material Mastery Rating Section */}
            <div>
              <label className="block text-xl font-semibold text-gray-900 mb-4 text-center">
                Penguasaan Materi
              </label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setMaterialMasteryRating(star)}
                    className={`w-16 h-16 rounded-full border-2 transition-all ${
                      materialMasteryRating >= star
                        ? 'bg-green-400 border-green-400 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="text-center mt-4">
                <span className="text-lg text-gray-600">
                  {materialMasteryRating === 0 && 'Pilih rating penguasaan materi'}
                  {materialMasteryRating === 1 && 'Sangat Buruk'}
                  {materialMasteryRating === 2 && 'Buruk'}
                  {materialMasteryRating === 3 && 'Cukup'}
                  {materialMasteryRating === 4 && 'Baik'}
                  {materialMasteryRating === 5 && 'Sangat Baik'}
                </span>
              </div>
            </div>

            {/* Communication Rating Section */}
            <div>
              <label className="block text-xl font-semibold text-gray-900 mb-4 text-center">
                Komunikasi
              </label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCommunicationRating(star)}
                    className={`w-16 h-16 rounded-full border-2 transition-all ${
                      communicationRating >= star
                        ? 'bg-purple-400 border-purple-400 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="text-center mt-4">
                <span className="text-lg text-gray-600">
                  {communicationRating === 0 && 'Pilih rating komunikasi'}
                  {communicationRating === 1 && 'Sangat Buruk'}
                  {communicationRating === 2 && 'Buruk'}
                  {communicationRating === 3 && 'Cukup'}
                  {communicationRating === 4 && 'Baik'}
                  {communicationRating === 5 && 'Sangat Baik'}
                </span>
              </div>
            </div>

            {/* Comment Section */}
            <div>
              <label htmlFor="comment" className="block text-xl font-semibold text-gray-900 mb-4 text-center">
                Komentar (Opsional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Berikan komentar atau saran untuk perbaikan layanan..."
                className="w-full h-32 p-4 border border-gray-300 rounded-xl text-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-500 mt-2">
                {comment.length}/500
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-colors ${
                isSubmitting || rating === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Feedback'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Feedback Anda akan membantu kami meningkatkan kualitas layanan
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show customer data when serving
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Loket TPT</h1>
          <p className="text-gray-600 text-lg mb-4">
            Pelanggan Sedang Dilayani
          </p>
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {queueToShow.queueNumber}
              </div>
              <div className="text-xl font-semibold text-gray-900 mb-1">
                {queueToShow.customer.name}
              </div>
              <div className="text-lg text-gray-600 mb-2">
                NPWP: {queueToShow.customer.npwp}
              </div>
              <div className="text-md text-gray-500">
                Layanan: {queueToShow.serviceType}
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Silakan tunggu hingga petugas menyelesaikan pelayanan untuk memberikan penilaian.
          </p>
        </div>
      </div>
    </div>
  );
}