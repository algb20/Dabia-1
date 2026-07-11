'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface PiUser { uid: string; username: string }

declare global {
  interface Window {
    Pi?: {
      init: (cfg: { version: string; sandbox?: boolean }) => void
      authenticate: (scopes: string[], onIncomplete: (payment: any) => void) => Promise<{ user: PiUser; accessToken: string }>
      createPayment: (data: any, callbacks: any) => void
    }
  }
}

export function usePiNetworkAuthentication() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [piUser,   setPiUser]   = useState<PiUser | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const tried = useRef(false)

  const authenticate = useCallback(async () => {
    if (tried.current) return
    tried.current = true
    try {
      const hasPi = typeof window !== 'undefined' && !!window.Pi
      if (!hasPi) {
        // خارج Pi Browser — وضع تجريبي فقط
        setIsAuthenticated(false)
        setPiUser(null)
        setLoading(false)
        return
      }
      window.Pi!.init({ version: '2.0', sandbox: false })
      const auth = await window.Pi!.authenticate(['username', 'payments'], async (payment) => {
        // معالجة دفعة غير مكتملة
        try {
          await fetch('/api/dabia/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete', paymentId: payment.identifier })
          })
        } catch {}
      })
      setIsAuthenticated(true)
      setPiUser(auth.user) // اسم المستخدم الحقيقي من Pi Network
      setError(null)
    } catch (e) {
      setIsAuthenticated(false)
      setError(e instanceof Error ? e.message : 'Pi auth failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { authenticate() }, [authenticate])

  return { isAuthenticated, piUser, loading, error, reinitialize: authenticate }
}
