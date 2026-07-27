'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  registerUser, getUserById, getUserByPiUid, getUserByAuthId, loginWithEmailPassword,
  loginOrRegisterWithPi, updateUser, tryAutoVerify, meetsVerificationRequirements, supabase,
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
    // تحقق من صحة البيانات — منع الشاشة السوداء. الهوية إمّا بريد أو معرّف Pi
    // (مستخدمو Pi أحادي النقرة قد لا يملكون بريداً حقيقياً).
    if (!p?.id || (!p?.emall && !p?.pi_uid)) { localStorage.removeItem(K_CACHE); return null }
    return p as DBUser
  } catch {
    try { localStorage.removeItem(K_CACHE) } catch {}
    return null
  }
}

// ── كشف بلد المستخدم تلقائياً وحفظه في حسابه ──────────────────────────────
// إن لم يكن للحساب بلد محفوظ (لم يُدخله عند التسجيل)، نكشفه مرة واحدة عبر
// خدمة تحديد الموقع بالـ IP (ipwho.is — مجانية بدون مفتاح) ونحفظه في users.country.
// يُستخدم لخدمة المستخدم (عروض/شحن حسب بلده) ولإحصاءات المنصة. محاولة واحدة
// لكل جلسة متصفح حتى لا نكرر الطلب، وفشلها صامت لا يؤثر على التطبيق.
let countryDetectTried = false
async function detectAndSaveCountry(u: DBUser, onSaved: (fresh: DBUser) => void) {
  if (countryDetectTried || !u.id || u.country) return
  countryDetectTried = true
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch('https://ipwho.is/', { signal: ctrl.signal })
    clearTimeout(timer)
    const geo = await res.json()
    if (geo?.success && typeof geo.country === 'string' && geo.country) {
      const fresh = await updateUser(u.id, { country: geo.country })
      if (fresh) onSaved(fresh)
    }
  } catch { /* كشف البلد ميزة تكميلية — لا نزعج المستخدم بفشلها */ }
}

// كشف الموقع الحقيقي عبر GPS المتصفح — مرة واحدة، صامت عند الرفض
const GEO_KEY = 'dabia_geo_v1'
export async function requestBrowserGeo(userId: string, onSaved: (country: string, city: string) => void): Promise<void> {
  if (typeof window === 'undefined') return
  if (typeof navigator === 'undefined' || !navigator.geolocation) return
  try {
    localStorage.setItem(GEO_KEY, 'asked')
  } catch {}
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 6000)
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          { signal: ctrl.signal }
        )
        clearTimeout(timer)
        const data = await res.json()
        const country = data?.countryName as string | undefined
        const city    = (data?.city || data?.locality || data?.principalSubdivision) as string | undefined
        if (country) {
          const updates: Record<string, string> = { country }
          if (city) updates.city = city
          await updateUser(userId, updates)
          onSaved(country, city || '')
        }
      } catch { /* فشل صامت */ }
    },
    () => { /* رفض الإذن — صامت */ },
    { timeout: 8000, maximumAge: 3600000 }
  )
}

export function geoAlreadyAsked(): boolean {
  try { return !!localStorage.getItem(GEO_KEY) } catch { return false }
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
            if (active && fresh) {
              setUser(fresh); saveCache(fresh)
              detectAndSaveCountry(fresh, updated => { if (active) { setUser(updated); saveCache(updated) } })
            }
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
          if (active && fresh) {
            setUser(fresh); saveCache(fresh)
            detectAndSaveCountry(fresh, updated => { if (active) { setUser(updated); saveCache(updated) } })
          }
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
      detectAndSaveCountry(res.user, updated => { setUser(updated); saveCache(updated) })
      return res.user
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  // ── دخول/تسجيل بنقرة واحدة عبر Pi Network (اسم/معرّف Pi فقط) ────────────
  // يستدعي Pi.authenticate داخل Pi Browser، ثم يُنشئ/يجلب حساب المشتري تلقائياً
  // بكامل الصلاحيات (شراء، حفظ، تعليق…) بلا بريد أو كلمة سر.
  const loginWithPi = useCallback(async (): Promise<DBUser> => {
    setLoading(true); setError(null)
    try {
      const Pi = typeof window !== 'undefined' ? (window as any).Pi : undefined
      if (!Pi) throw new Error('Open Dabia inside Pi Browser to continue with Pi')
      try { Pi.init?.({ version: '2.0', sandbox: false }) } catch {}
      const auth = await Pi.authenticate(['username', 'payments'], () => {})
      const uid      = auth?.user?.uid || ''
      const username = auth?.user?.username || ''
      if (!uid) throw new Error('Could not read your Pi identity — try again')

      const res = await loginOrRegisterWithPi(uid, username)
      if (!res.ok || !res.user) throw new Error(res.error || 'Pi sign-in failed')
      saveCache(res.user)
      if (res.user.id) localStorage.setItem(K_UID, res.user.id)
      setUser(res.user)
      detectAndSaveCountry(res.user, updated => { setUser(updated); saveCache(updated) })
      return res.user
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Pi sign-in failed'
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
      detectAndSaveCountry(u, updated => { setUser(updated); saveCache(updated) })
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
    register, login, loginWithPi, logout, updateProfile, saveProduct,
    isLoggedIn:          !!user,
    isBuyer:             user?.role === 'buyer',
    isMerchant:          ['merchant','company','factory','agent','service_provider','partner'].includes(user?.role ?? ''),
    verificationRule:    VERIFICATION_REQUIREMENTS[user?.role ?? 'buyer'],
    meetsRequirements:   user ? meetsVerificationRequirements(user) : false,
  }
}
