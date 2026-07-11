'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  registerUser, getUserById, getUserByPiUid, getUserByAuthId, loginWithEmailPassword,
  updateUser, tryAutoVerify, meetsVerificationRequirements, supabase,
  VERIFICATION_REQUIREMENTS, type DBUser
} from '@/lib/dabia/db'

export type { DBUser as DabiaUser }

const K_CACHE = 'dabia_user_v4'
const K_UID   = 'dabia_uid_v4'

function saveCache(u: DBUser) {
  try { localStorage.setItem(K_CACHE, JSON.stringify(u)) } catch {}
}
function loadCache(): DBUser | null {
  try {
    const r = localStorage.getItem(K_CACHE)
    if (!r) return null
    const p = JSON.parse(r)
    // تحقق من صحة البيانات — منع الشاشة السوداء
    if (!p?.id || !p?.emall) { localStorage.removeItem(K_CACHE); return null }
    return p as DBUser
  } catch {
    try { localStorage.removeItem(K_CACHE) } catch {}
    return null
  }
}

export function useUserAuth() {
  const router  = useRouter()
  const [user,    setUser]    = useState<DBUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // ── تحميل بيانات المستخدم عند بدء التطبيق ─────────────────────────────
  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const cached = loadCache()
        if (cached) {
          if (active) setUser(cached) // عرض فوري من الكاش
          // تحديث من Supabase في الخلفية بدون إعاقة التحميل
          getUserById(cached.id!).then(fresh => {
            if (active && fresh) { setUser(fresh); saveCache(fresh) }
          }).catch(() => {})
          return
        }
        // لا يوجد كاش محلي للتطبيق — لكن قد تكون جلسة Supabase الحقيقية
        // (تُدار بمفتاحها الخاص من مكتبة Supabase، مستقلة عن كاش التطبيق)
        // لا تزال سليمة. هذا يستعيد تسجيل الدخول تلقائياً في هذه الحالة
        // بدل إجبار المستخدم على إعادة تسجيل الدخول من الصفر.
        const { data: sessionData } = await supabase.auth.getSession()
        const authId = sessionData?.session?.user?.id
        if (authId) {
          const fresh = await getUserByAuthId(authId)
          if (active && fresh) { setUser(fresh); saveCache(fresh) }
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    init()
    return () => { active = false }
  }, [])

  // ── تسجيل الدخول لحساب موجود فعلاً — هذا ما كان مفقوداً تماماً ──────────
  const login = useCallback(async (email: string, password: string): Promise<DBUser> => {
    setLoading(true); setError(null)
    try {
      const res = await loginWithEmailPassword(email, password)
      if (!res.ok || !res.user) {
        throw new Error(res.error || 'Login failed')
      }
      saveCache(res.user)
      if (res.user.id) localStorage.setItem(K_UID, res.user.id)
      setUser(res.user)
      return res.user
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  // ── تسجيل مستخدم جديد ──────────────────────────────────────────────────
  const register = useCallback(async (
    emall:    string,
    role:     string,
    profile:  Record<string, any>,
    piInfo?:  { uid?: string; username?: string } // بيانات Pi جاهزة من الصفحة — تمنع استدعاء authenticate مرتين
  ): Promise<DBUser> => {
    setLoading(true); setError(null)
    try {
      let piUid    = piInfo?.uid      || ''
      let username = piInfo?.username || ''

      // فقط إذا لم تُمرَّر بيانات Pi جاهزة من الخارج، نحاول جلبها (حالة احتياطية)
      if (!piUid && typeof window !== 'undefined' && window.Pi) {
        try {
          const auth = await window.Pi.authenticate(['username', 'payments'], () => {})
          piUid    = auth?.user?.uid      || ''
          username = auth?.user?.username || ''
        } catch {}
      }

      // إذا لم يكن داخل Pi Browser — استخدم جزء الإيميل كاسم مؤقت
      if (!username) username = emall.split('@')[0] || 'User'

      // تحقق أولاً إذا كان pi_uid مسجّلاً مسبقاً (تجنب التكرار)
      if (piUid) {
        const existing = await getUserByPiUid(piUid)
        if (existing) {
          saveCache(existing)
          localStorage.setItem(K_UID, existing.id!)
          setUser(existing)
          return existing
        }
      }

      let u = await registerUser({
        username,
        emall,
        password:   profile.password   || undefined,
        phone:      profile.phone      || undefined,
        country:    profile.country    || undefined,
        role,
        pi_uid:     piUid              || undefined,
        store_name: profile.storeName  || profile.companyName || undefined,
      })

      // ترقية فورية إذا استوفى الشروط (buyer دائماً، وغيره إذا أكمل البيانات)
      u = await tryAutoVerify(u)
      saveCache(u)
      if (u.id) localStorage.setItem(K_UID, u.id)
      setUser(u)
      return u
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  // ── تحديث الملف الشخصي مع إعادة التحقق التلقائي ──────────────────────
  const updateProfile = useCallback(async (updates: Partial<DBUser>) => {
    if (!user?.id) return
    let u = await updateUser(user.id, updates)
    if (!u) throw new Error("Failed to save changes")
    u = await tryAutoVerify(u)
    saveCache(u)
    setUser(u)
  }, [user])

  // ── حفظ/إلغاء حفظ منتج ──────────────────────────────────────────────
  const saveProduct = useCallback((productId: string) => {
    setUser(prev => {
      if (!prev) return null
      const list    = (prev as any).savedProducts || []
      const updated = {
        ...prev,
        savedProducts: list.includes(productId)
          ? list.filter((id: string) => id !== productId)
          : [...list, productId]
      }
      saveCache(updated)
      return updated
    })
  }, [])

  // ── تسجيل الخروج ──────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(K_CACHE)
      localStorage.removeItem(K_UID)
      await supabase.auth.signOut() // إنهاء الجلسة الحقيقية — وليس فقط مسح الكاش المحلي
    } catch {}
    setUser(null)
    router.push('/')
  }, [router])

  return {
    user, loading, error,
    register, login, logout, updateProfile, saveProduct,
    isLoggedIn:          !!user,
    isBuyer:             user?.role === 'buyer',
    isMerchant:          ['merchant','company','factory','agent','service_provider','partner'].includes(user?.role ?? ''),
    verificationRule:    VERIFICATION_REQUIREMENTS[user?.role ?? 'buyer'],
    meetsRequirements:   user ? meetsVerificationRequirements(user) : false,
  }
}
