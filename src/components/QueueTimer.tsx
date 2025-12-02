'use client'

import { useState, useEffect, useRef } from 'react'

interface QueueTimerProps {
  queueStartTime: string // ISO string of when the queue started
  isActive: boolean // Whether this timer should be running
  onAlarm?: () => void // Callback when 20 minutes is reached
}

export default function QueueTimer({ queueStartTime, isActive, onAlarm }: QueueTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [hasAlarmed, setHasAlarmed] = useState(false)
  const [showAlarmPopup, setShowAlarmPopup] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // No need to create audio element since we're using Web Audio API
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      const startTime = new Date(queueStartTime).getTime()

      intervalRef.current = setInterval(() => {
        const now = new Date().getTime()
        const elapsed = Math.floor((now - startTime) / 1000) // elapsed time in seconds
        setElapsedTime(elapsed)

        // Check if 20 minutes (1200 seconds) have passed
        if (elapsed >= 1200 && !hasAlarmed) {
          setHasAlarmed(true)
          setShowAlarmPopup(true)
          playAlarm()
          onAlarm?.()
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, queueStartTime, hasAlarmed, onAlarm])

  const playAlarm = () => {
    createAlarmSound()
  }

  const createAlarmSound = () => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Create an alarm-like sound: alternating high-low frequencies
        const currentTime = audioContext.currentTime
        oscillator.frequency.setValueAtTime(1000, currentTime)
        oscillator.frequency.setValueAtTime(1000, currentTime + 0.2)
        oscillator.frequency.setValueAtTime(800, currentTime + 0.2)
        oscillator.frequency.setValueAtTime(800, currentTime + 0.4)
        oscillator.frequency.setValueAtTime(1200, currentTime + 0.4)
        oscillator.frequency.setValueAtTime(1200, currentTime + 0.6)
        oscillator.frequency.setValueAtTime(1000, currentTime + 0.6)

        gainNode.gain.setValueAtTime(0.3, currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.8)

        oscillator.start(currentTime)
        oscillator.stop(currentTime + 0.8)

        // Repeat the alarm after a short pause
        setTimeout(() => {
          if (hasAlarmed) { // Check if still alarming
            const oscillator2 = audioContext.createOscillator()
            const gainNode2 = audioContext.createGain()

            oscillator2.connect(gainNode2)
            gainNode2.connect(audioContext.destination)

            const time2 = audioContext.currentTime
            oscillator2.frequency.setValueAtTime(1200, time2)
            oscillator2.frequency.setValueAtTime(1200, time2 + 0.2)
            oscillator2.frequency.setValueAtTime(1000, time2 + 0.2)
            oscillator2.frequency.setValueAtTime(1000, time2 + 0.4)
            oscillator2.frequency.setValueAtTime(1400, time2 + 0.4)

            gainNode2.gain.setValueAtTime(0.3, time2)
            gainNode2.gain.exponentialRampToValueAtTime(0.01, time2 + 0.6)

            oscillator2.start(time2)
            oscillator2.stop(time2 + 0.6)
          }
        }, 1000)

      } catch (e) {
        console.log('Web Audio API failed, using alert as final fallback:', e)
        // Final fallback: browser notification or alert
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⏰ Queue Timer Alert', {
            body: 'Second customer in queue has been waiting for 20 minutes!',
            icon: '/favicon.ico'
          })
        } else {
          alert('⚠️ TIMER ALERT: Second customer in queue has been waiting for 20 minutes!')
        }
      }
    } else {
      // Ultimate fallback
      alert('⚠️ TIMER ALERT: Second customer in queue has been waiting for 20 minutes!')
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimerColor = (): string => {
    const minutes = Math.floor(elapsedTime / 60)

    if (minutes >= 20) {
      return 'text-red-600 bg-red-50 border-red-200'
    } else if (minutes >= 15) {
      return 'text-orange-600 bg-orange-50 border-orange-200'
    } else if (minutes >= 10) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    } else {
      return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const dismissAlarm = () => {
    setShowAlarmPopup(false)
  }

  if (!isActive) {
    return null
  }

  return (
    <>
      <div className={`inline-flex items-center px-2 py-1 rounded-md border text-sm font-mono ${getTimerColor()}`}>
        <span className="mr-1">⏱️</span>
        <span className="font-semibold">{formatTime(elapsedTime)}</span>
        {Math.floor(elapsedTime / 60) >= 20 && (
          <span className="ml-1 animate-pulse">🚨</span>
        )}
      </div>

      {/* Alarm Popup Modal */}
      {showAlarmPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-pulse">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🚨</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">TIMER ALERT!</h2>
              <p className="text-gray-700 mb-4">
                Customer has been waiting for <strong>20 minutes</strong>!
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-red-800">
                  <p className="font-semibold">Waiting Time: {formatTime(elapsedTime)}</p>
                  <p className="text-xs mt-1">Please prioritize this customer</p>
                </div>
              </div>
              <button
                onClick={dismissAlarm}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}