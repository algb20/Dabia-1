import { createClient } from "@supabase/supabase-js"

// ═══════════════════════════════════════════════════════════════════════════════
// تشفير كلمات السر — مدمج مباشرة هنا (بدل استيراد ملف منفصل) لتجنب مشاكل bundling
// يستخدم Web Crypto API المدمجة (لا حاجة لمكتبات خارجية) — SHA-256 مع Salt فريد
// ═══════════════════════════════════════════════════════════════════════════════
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// PBKDF2-SHA256 بعدد جولات مرتفع — أبطأ بكثير على المهاجم (كسر القوة الغاشمة)
// من SHA-256 بجولة واحدة، وبدون أي مكتبة خارجية (Web Crypto المدمجة).
const PBKDF2_ITERATIONS = 100_000
async function pbkdf2Hex(plain: string, salt: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations, hash: 'SHA-256' },
    keyMaterial, 256,
  )
  return toHex(bits)
}

// يُنتج قيمة بالشكل pbkdf2$iterations$salt$hash لتُخزَّن في عمود password
async function hashPassword(plain: string): Promise<string> {
  const salt = randomSalt()
  const hash = await pbkdf2Hex(plain, salt)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`
}

// يعيد true إن كانت القيمة المخزَّنة تحتاج إعادة تجزئة إلى الصيغة الأحدث (ترقية شفّافة)
export function needsRehash(stored: string): boolean {
  return !stored.startsWith('pbkdf2$')
}

// يتحقق من كلمة السر مقابل المخزَّن — يدعم كل الصيغ للتوافق أثناء الانتقال:
//  pbkdf2$iter$salt$hash (الأحدث) · salt:hash (SHA-256 قديم) · نص عادي (أقدم)
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false
  if (stored.startsWith('pbkdf2$')) {
    const [, iterStr, salt, hash] = stored.split('$')
    const computed = await pbkdf2Hex(plain, salt, parseInt(iterStr, 10) || PBKDF2_ITERATIONS)
    return computed === hash
  }
  if (stored.includes(':')) {
    const [salt, hash] = stored.split(':')
    return (await sha256Hex(salt + plain)) === hash
  }
  // كلمة سر قديمة بنص عادي (توافق خلفي فقط)
  return plain === stored
}

const SUPABASE_URL = "https://fjeyhpasqhhqebqmhcmy.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZXlocGFzcWhocWVicW1oY215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTYyMDcsImV4cCI6MjA5NTgzMjIwN30.0eluGIJX-9QGgjsD_ipk1z688aWLW2fiuxqmeFGx4WI"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DBUser {
  id?:             string
  username:        string
  emall:           string
  password?:       string
  phone?:          string
  country?:        string
  role?:           string
  status?:         string
  account_type?:   'standard' | 'premium' | 'official'  // الشارة — يُمنح من الخادم بعد اشتراك مدفوع
  pi_uid?:         string
  store_name?:     string
  wallet_balance?: number
  profile?:        Record<string, any>
  created_at?:     string
  savedProducts?:  string[]
  avatar_url?:     string
  bio?:            string
  website_url?:    string
  auth_id?:        string
  social_links?: {
    telegram?:  { url: string; enabled: boolean }
    instagram?: { url: string; enabled: boolean }
    x?:         { url: string; enabled: boolean }
    email_public?: { enabled: boolean }
  }
}

export interface DBProduct {
  id?:             string
  name:            string
  description?:    string
  price:           number
  original_price?: number  // إذا كان أعلى من price، يُحسب الخصم تلقائياً ويُعرض شريط %off
  category?:       string
  image?:          string
  images?:         string[] // صور متعددة للمنتج
  video_url?:      string | null // فيديو قصير للمنتج (Reels)
  seller_user_id?: string
  seller_name?:    string
  seller_account_type?: 'standard' | 'premium' | 'official' // شارة البائع — تُرفق عند الجلب لعرض العلامة الرسمية/المميّزة
  stock?:          number
  rating?:         number
  review_count?:   number
  active?:         boolean  // إيقاف/تفعيل المنتج دون حذفه
  deal_ends_at?:   string | null // عرض محدود بوقت — يضبطه التاجر من إدارة متجره
  deal_label?:     string | null
  created_at?:     string
  updated_at?:     string
}

export interface OrderStatusEvent { status: string; at: string; note?: string; carrier?: string; tracking?: string }
export interface DBOrder {
  id?:              string
  order_number?:    string  // رقم طلب فريد مقروء (يُولَّد في القاعدة)
  user_id:          string
  product_id:       string
  product_name?:     string
  product_image?:    string
  seller_user_id?:   string
  seller_name?:      string
  quantity?:         number
  unit_price?:       number
  total_price:       number
  status?:           'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  // معلومات الشحن المنظّمة (يُدخلها المشتري عند الطلب)
  recipient_name?:   string
  recipient_phone?:  string
  ship_country?:     string
  ship_city?:        string
  ship_address?:     string
  ship_postal?:      string
  shipping_address?: string
  tracking_note?:    string
  carrier?:          string  // شركة الشحن (يُدخلها البائع)
  tracking_number?:  string  // رقم تتبّع الشحنة الخارجي
  status_history?:   OrderStatusEvent[]
  escrow_status?:    'held' | 'released' | 'refunded' // ضمان: محتجز/محرَّر/مسترجَع
  escrow_released_at?: string
  pi_tx_id?:         string
  created_at?:       string
  updated_at?:       string
}

export interface DBWalletTransaction {
  id?:         string
  user_id:     string
  type:        'payment' | 'receive' | 'refund'
  amount:      number
  description: string
  pi_tx_id?:   string
  status:      'pending' | 'completed' | 'failed'
  created_at?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════
export async function registerUser(d: {
  username: string; emall: string; password?: string; phone?: string
  country?: string; role?: string; pi_uid?: string; store_name?: string; website_url?: string
}): Promise<DBUser> {
  const existing = await getUserByEmail(d.emall)
  if (existing) return existing

  // منع إنشاء أكثر من حساب بنفس معرّف Pi الحقيقي — يحل "يمكن إنشاء أكثر من حساب"
  if (d.pi_uid) {
    const existingByPi = await getUserByPiUid(d.pi_uid)
    if (existingByPi) return existingByPi
  }

  const role = d.role ?? 'buyer'

  // 1) إنشاء حساب Supabase Auth حقيقي أولاً — هذا ما يربط الهوية فعلياً بـ RLS
  const authPassword = d.password || crypto.randomUUID()
  const { data: authData } = await supabase.auth.signUp({ email: d.emall, password: authPassword })

  // قبول تلقائي فوري للتجار: إن استوفى الحساب شروط التحقق الأساسية (اسم متجر + بلد
  // أو موقع) عند التسجيل مباشرة، يُفعَّل فوراً دون أي انتظار للمراجعة اليدوية
  const meetsAutoApproval = role === 'buyer' || !!(d.store_name && (d.country || d.website_url))
  const status = meetsAutoApproval ? 'active' : 'pending'

  const row: Record<string, any> = {
    username: d.username, emall: d.emall,
    role, status,
    wallet_balance: 0, profile: {},
    auth_id: authData?.user?.id || null,
  }
  if (d.password)     row.password     = await hashPassword(d.password)
  if (d.phone)        row.phone        = d.phone
  if (d.country)      row.country      = d.country
  if (d.pi_uid)       row.pi_uid       = d.pi_uid
  if (d.store_name)   row.store_name   = d.store_name
  if (d.website_url)  row.website_url  = d.website_url

  const { data, error } = await supabase.from('users').insert(row).select().single()
  if (!error && data) return data as DBUser

  if (error?.message.includes('column')) {
    const { data: d2, error: e2 } = await supabase
      .from('users')
      .insert({ username: d.username, emall: d.emall, role, status })
      .select().single()
    if (e2) throw new Error(e2.message)
    return d2 as DBUser
  }
  throw new Error(error?.message || 'Registration failed')
}

export async function getUserByEmail(emall: string): Promise<DBUser | null> {
  try { const { data } = await supabase.from('users').select('*').eq('emall', emall).maybeSingle(); return data as DBUser | null } catch { return null }
}

// تسجيل الدخول لحساب موجود فعلاً بالإيميل وكلمة السر — هذا ما كان مفقوداً تماماً
export async function loginWithEmailPassword(email: string, password: string): Promise<{ ok: boolean; user?: DBUser; error?: string }> {
  try {
    const user = await getUserByEmail(email)
    if (!user) return { ok: false, error: "No account found with this email" }
    if (!user.password) return { ok: false, error: "This account has no password set. Use 'Forgot Password' to set one." }
    const valid = await verifyPassword(password, user.password)
    if (!valid) return { ok: false, error: "Incorrect password" }

    // ترقية تلقائية شفّافة: أي كلمة سر بصيغة قديمة (نص عادي أو SHA-256) تُعاد
    // تجزئتها إلى PBKDF2 الآن في الخلفية دون إزعاج المستخدم.
    if (needsRehash(user.password) && user.id) {
      hashPassword(password).then(upgraded => updateUser(user.id!, { password: upgraded }))
    }

    // إنشاء جلسة Supabase Auth حقيقية — أساس عمل كل سياسات RLS والحمايات
    // (auth.uid() يعتمد على جلسة فعلية). مع التأكيد التلقائي للبريد تُنشأ الجلسة
    // فوراً. الحسابات القديمة (بلا حساب Auth) يُنشأ لها الآن تلقائياً وبصمت.
    let { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      await supabase.auth.signUp({ email, password })
      // بعض الإعدادات تتطلب دخولاً صريحاً بعد الإنشاء
      await supabase.auth.signInWithPassword({ email, password }).catch(() => {})
    }

    // ربط الحساب بهويته عبر دالة آمنة (تطابق البريد) — تعمل حتى للصفوف غير المربوطة
    if (user.id) {
      try { await supabase.rpc('link_auth_id', { p_user_id: Number(user.id) }) } catch {}
      const fresh = await getUserById(user.id)
      if (fresh) return { ok: true, user: fresh }
    }

    return { ok: true, user }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Login failed" }
  }
}
export async function getUserById(id: string): Promise<DBUser | null> {
  try { const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle(); return data as DBUser | null } catch { return null }
}

// تسجيل/دخول بمعرّف Pi فقط — أبسط طريقة: نقرة واحدة داخل Pi Browser بلا بريد/كلمة سر.
// إن كان معرّف Pi مسجّلاً سابقاً نُرجع حسابه، وإلا نُنشئ حساب مشترٍ فعّالاً فوراً
// (كامل الصلاحيات: شراء، حفظ، تعليق…). نُولّد بريداً اصطناعياً ثابتاً مرتبطاً
// بمعرّف Pi لإبقاء ربط جلسة Supabase/RLS سليماً دون أن يُدخل المستخدم أي بريد.
export async function loginOrRegisterWithPi(piUid: string, piUsername: string): Promise<{ ok: boolean; user?: DBUser; error?: string }> {
  try {
    if (!piUid) return { ok: false, error: "Pi identity is required" }
    const existing = await getUserByPiUid(piUid)
    if (existing) return { ok: true, user: existing }

    const uname = (piUsername || `pi_${piUid.slice(0, 8)}`).trim()
    const synthEmail = `pi.${piUid.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@pi.dabia.app`
    let u = await registerUser({ username: uname, emall: synthEmail, role: "buyer", pi_uid: piUid })
    u = await tryAutoVerify(u)
    return { ok: true, user: u }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Pi sign-in failed" }
  }
}
export async function getUserByAuthId(auth_id: string): Promise<DBUser | null> {
  try { const { data } = await supabase.from('users').select('*').eq('auth_id', auth_id).maybeSingle(); return data as DBUser | null } catch { return null }
}

export async function getUserByPiUid(pi_uid: string): Promise<DBUser | null> {
  try { const { data } = await supabase.from('users').select('*').eq('pi_uid', pi_uid).maybeSingle(); return data as DBUser | null } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT RECOVERY SEARCH — "هل لدي حساب؟" بحث بالاسم أو معرّف Pi الرسمي
// ═══════════════════════════════════════════════════════════════════════════════
export interface AccountSearchResult { id: string; username: string; role: string; pi_uid?: string; avatar_url?: string; store_name?: string; emallMasked: string }

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!user || !domain) return '***'
  const visible = user.slice(0, Math.min(2, user.length))
  return `${visible}${'*'.repeat(Math.max(2, user.length - 2))}@${domain}`
}

// يبحث بمعرف Pi (تطابق دقيق) أو باسم المستخدم/اسم المتجر (تطابق جزئي) — لا يكشف
// الإيميل الكامل أو كلمة السر إطلاقاً، فقط معلومات تعريفية عامة لمساعدة المستخدم
// على التأكد من وجود حسابه قبل محاولة استعادته فعلياً عبر "Forgot Password"
export async function searchAccounts(query: string): Promise<AccountSearchResult[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const byPiUid = await getUserByPiUid(q)
    if (byPiUid) {
      return [{ id: byPiUid.id!, username: byPiUid.username, role: byPiUid.role || 'buyer', pi_uid: byPiUid.pi_uid, avatar_url: byPiUid.avatar_url, store_name: byPiUid.store_name, emallMasked: maskEmail(byPiUid.emall) }]
    }
    const { data } = await supabase.from('users').select('*').or(`username.ilike.%${q}%,store_name.ilike.%${q}%`).limit(10)
    return ((data ?? []) as DBUser[]).map(u => ({ id: u.id!, username: u.username, role: u.role || 'buyer', pi_uid: u.pi_uid, avatar_url: u.avatar_url, store_name: u.store_name, emallMasked: maskEmail(u.emall) }))
  } catch { return [] }
}
// ── روابط التواصل الرسمية للتطبيق (وليست الشخصية) ──────────────────
// تُدار بالكامل من جدول app_official_links في Supabase — التحكم بها
// (تفعيل/تعطيل/تغيير الرابط) يكون مباشرة من Supabase Table Editor، بدون
// أي حاجة لإعادة نشر التطبيق. راجع SUPABASE_OFFICIAL_LINKS.sql لإنشاء الجدول.
export type OfficialLinkPlatform = "facebook" | "instagram" | "x" | "telegram" | "youtube" | "tiktok"
export interface OfficialLink { platform: OfficialLinkPlatform; url: string; enabled: boolean }

export async function getOfficialLinks(): Promise<OfficialLink[]> {
  try {
    const { data, error } = await supabase.from("app_official_links").select("platform,url,enabled")
    if (error || !data) return []
    return data as OfficialLink[]
  } catch { return [] }
}

// تحديث رابط رسمي واحد من لوحة الأدمن (بديل لتعديله يدوياً من Supabase Table Editor)
export async function upsertOfficialLink(platform: OfficialLinkPlatform, url: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.from('app_official_links').upsert({ platform, url, enabled }, { onConflict: 'platform' })
    return !error
  } catch { return false }
}

// ── تحقق تلقائي خفيف من ملكية البريد التجاري (لمنع انتحال اسم شركة/مصنع) ──
// المبدأ: إن طابق نطاق البريد (بعد @) نطاق الموقع الذي أدخله المستخدم، فهذا
// دليل تلقائي قوي (لا يحتاج وثائق) أنه يتحكم بنفس النطاق فعلياً — وهذا أصعب
// تزويراً من مجرد كتابة اسم شركة. لا يحجب أو يُصعّب التسجيل أبداً؛ فقط يضيف
// إشارة ثقة إضافية تظهر للمستخدم ولفريق المراجعة، ويبقى القرار النهائي للمراجعة
// اليدوية كما هو — هذا يُسرّع ويُحسّن المراجعة، لا يستبدلها.
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
  "protonmail.com","aol.com","live.com","mail.com","yandex.com","gmx.com",
])

export interface BusinessEmailSignal {
  emailDomain:     string | null
  websiteDomain:   string | null
  domainVerified:  boolean // نطاق البريد يطابق نطاق الموقع المُدخل
  genericProvider: boolean // يستخدم مزوّد بريد عام (Gmail, Yahoo...) بدل بريد رسمي
}

export function getBusinessEmailSignal(user: Pick<DBUser, "emall" | "website_url">): BusinessEmailSignal {
  const emailDomain = user.emall?.split("@")[1]?.toLowerCase().trim() || null
  let websiteDomain: string | null = null
  if (user.website_url) {
    try {
      const raw = user.website_url.trim()
      const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
      websiteDomain = url.hostname.replace(/^www\./, "").toLowerCase()
    } catch { websiteDomain = null }
  }
  const domainVerified = !!(emailDomain && websiteDomain && (
    emailDomain === websiteDomain ||
    emailDomain.endsWith(`.${websiteDomain}`) ||
    websiteDomain.endsWith(`.${emailDomain}`)
  ))
  const genericProvider = !!(emailDomain && GENERIC_EMAIL_DOMAINS.has(emailDomain))
  return { emailDomain, websiteDomain, domainVerified, genericProvider }
}

export async function updateUser(id: string, u: Partial<DBUser>): Promise<DBUser | null> {
  try {
    // ربط الحساب بهويته الحقيقية تلقائياً إذا لم يكن مربوطاً بعد (حسابات قديمة)
    const { data: session } = await supabase.auth.getSession()
    const payload: any = { ...u }
    if (session?.session?.user?.id) payload.auth_id = session.session.user.id
    const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single()
    if (error) {
      // مهم: لا نُخفي الخطأ — الواجهة (handleSave وغيرها) تحتاج معرفة الفشل
      // الحقيقي بدل افتراض النجاح. هذا كان يجعل الحفظ "يبدو ناجحاً" دائماً
      // حتى عند رفض RLS للتحديث.
      console.error('[updateUser] Supabase error:', error.message, error.details || '')
      return null
    }
    return data as DBUser
  } catch (e) {
    console.error('[updateUser] Exception:', e instanceof Error ? e.message : e)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY — تغيير كلمة السر بالتحقق الحقيقي من كلمة السر الحالية أولاً
// ═══════════════════════════════════════════════════════════════════════════════
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: user, error: fetchErr } = await supabase.from('users').select('password, emall').eq('id', userId).single()
    if (fetchErr || !user) return { ok: false, error: 'Account not found' }
    if (!user.password) return { ok: false, error: 'No password set on this account yet' }

    const valid = await verifyPassword(currentPassword, user.password)
    if (!valid) return { ok: false, error: 'Current password is incorrect' }
    if (newPassword.length < 6) return { ok: false, error: 'New password must be at least 6 characters' }

    const hashed = await hashPassword(newPassword)
    const { error: updateErr } = await supabase.from('users').update({ password: hashed }).eq('id', userId)
    if (updateErr) return { ok: false, error: updateErr.message }

    // مزامنة كلمة السر مع Supabase Auth الحقيقي إن وُجدت جلسة (يبقيها متوافقة لتسجيل الدخول لاحقاً)
    try { await supabase.auth.updateUser({ password: newPassword }) } catch {}

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to change password' }
  }
}

// حذف الحساب نهائياً — معيار أساسي مطلوب بكل التطبيقات العالمية (GDPR وغيره)
export async function deleteAccount(userId: string): Promise<boolean> {
  try {
    // حذف منتجاته أولاً (إن كان تاجراً) لتجنب سجلات يتيمة
    await supabase.from('products').delete().eq('seller_user_id', userId)
    const { error } = await supabase.from('users').delete().eq('id', userId)
    return !error
  } catch { return false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL — تفاعل حقيقي: لايك، عدد مشاركات حقيقي (لا عدادات وهمية)
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBLike { id?: string; user_id: string; product_id: string; created_at?: string }

export async function toggleLike(userId: string, productId: string): Promise<{ liked: boolean }> {
  try {
    const { data: existing } = await supabase.from('product_likes').select('id')
      .eq('user_id', userId).eq('product_id', productId).maybeSingle()
    if (existing) {
      await supabase.from('product_likes').delete().eq('id', existing.id)
      return { liked: false }
    }
    await supabase.from('product_likes').insert({ user_id: userId, product_id: productId })
    return { liked: true }
  } catch { return { liked: false } }
}

export async function getLikeCount(productId: string): Promise<number> {
  try {
    const { count } = await supabase.from('product_likes').select('id', { count: 'exact', head: true }).eq('product_id', productId)
    return count ?? 0
  } catch { return 0 }
}

export async function isLikedByUser(userId: string, productId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('product_likes').select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle()
    return !!data
  } catch { return false }
}

// تسجيل مشاركة حقيقية (عداد فعلي لمدى انتشار المنتج، ليس رقماً ثابتاً)
export async function recordShare(productId: string, userId?: string): Promise<void> {
  try { await supabase.from('product_shares').insert({ product_id: productId, user_id: userId || null }) } catch {}
}

export async function getShareCount(productId: string): Promise<number> {
  try {
    const { count } = await supabase.from('product_shares').select('id', { count: 'exact', head: true }).eq('product_id', productId)
    return count ?? 0
  } catch { return 0 }
}

// التعليقات الحقيقية على المنتجات
export interface DBComment {
  id?: string; product_id: string; user_id: string; username: string
  avatar_url?: string; text: string; parent_id?: string | null
  like_count?: number; created_at?: string
  liked?: boolean       // محسوب للمستخدم الحالي (واجهة)
  replies?: DBComment[] // مبنية شجرياً في الواجهة
}

export async function addComment(c: DBComment): Promise<{ comment: DBComment | null; error?: string }> {
  try {
    const row: any = { product_id: c.product_id, user_id: c.user_id, username: c.username, avatar_url: c.avatar_url, text: c.text }
    if (c.parent_id) row.parent_id = Number(c.parent_id)
    const { data, error } = await supabase.from('product_comments').insert(row).select().single()
    if (error) { console.error('[addComment]', error.message); return { comment: null, error: error.message } }
    return { comment: data as DBComment }
  } catch (e) { return { comment: null, error: e instanceof Error ? e.message : 'Failed to comment' } }
}

// إعجاب/إلغاء إعجاب على تعليق (العدّاد يُحدَّث بـ trigger في القاعدة)
export async function toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean }> {
  try {
    const { data: existing } = await supabase.from('comment_likes').select('id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
    if (existing) { await supabase.from('comment_likes').delete().eq('id', existing.id); return { liked: false } }
    await supabase.from('comment_likes').insert({ comment_id: Number(commentId), user_id: Number(userId) })
    return { liked: true }
  } catch { return { liked: false } }
}
export async function getCommentLikes(userId: string, commentIds: string[]): Promise<Set<string>> {
  try {
    if (commentIds.length === 0) return new Set()
    const { data } = await supabase.from('comment_likes').select('comment_id').eq('user_id', userId).in('comment_id', commentIds)
    return new Set((data ?? []).map((r: any) => String(r.comment_id)))
  } catch { return new Set() }
}

export async function getComments(productId: string): Promise<DBComment[]> {
  try {
    const { data } = await supabase.from('product_comments').select('*').eq('product_id', productId).order('created_at', { ascending: false }).limit(50)
    return (data ?? []) as DBComment[]
  } catch { return [] }
}

// تعديل تعليق (لصاحبه فقط — يُتحقق في الواجهة بإظهار الزر لصاحب التعليق)
export async function updateComment(commentId: string, text: string): Promise<boolean> {
  try { const { error } = await supabase.from('product_comments').update({ text }).eq('id', commentId); return !error } catch { return false }
}
// حذف تعليق
export async function deleteComment(commentId: string): Promise<boolean> {
  try { const { error } = await supabase.from('product_comments').delete().eq('id', commentId); return !error } catch { return false }
}

// ─── نظام التحقق حسب نوع الحساب ──────────────────────────────────────────────
export const VERIFICATION_REQUIREMENTS: Record<string, {
  autoApprove: boolean; requiredFields: string[]; reviewWindowHours: number
}> = {
  buyer:            { autoApprove: true,  requiredFields: [],                       reviewWindowHours: 0  },
  merchant:         { autoApprove: false, requiredFields: ['store_name'],           reviewWindowHours: 24 },
  agent:            { autoApprove: false, requiredFields: ['store_name'],           reviewWindowHours: 24 },
  service_provider: { autoApprove: false, requiredFields: ['store_name'],           reviewWindowHours: 24 },
  company:          { autoApprove: false, requiredFields: ['store_name','country'], reviewWindowHours: 48 },
  factory:          { autoApprove: false, requiredFields: ['store_name','country'], reviewWindowHours: 48 },
  partner:          { autoApprove: false, requiredFields: ['store_name','country'], reviewWindowHours: 48 },
}

export function meetsVerificationRequirements(user: DBUser): boolean {
  const rule = VERIFICATION_REQUIREMENTS[user.role ?? 'buyer']
  if (!rule) return false
  if (rule.autoApprove) return true
  return rule.requiredFields.every(f => !!(user as any)[f])
}

export async function tryAutoVerify(user: DBUser): Promise<DBUser> {
  if (user.status === 'active' || user.status === 'verified') return user
  if (!user.id) return user

  // التفعيل التلقائي يتمّ الآن عبر دالة موثوقة في القاعدة تفرض القواعد على
  // الخادم (لا يستطيع العميل تفعيل نفسه بتجاوز الشروط، وحارس status يمنع ذلك).
  try {
    const { data, error } = await supabase.rpc('auto_verify_self', { p_user_id: Number(user.id) })
    if (!error && data) {
      const updated = data as DBUser
      if (updated.status === 'active') return updated
      user = updated
    }
  } catch { /* نتراجع بأمان */ }

  // تحقّق تجاري بالنطاق: القرار والتفعيل يتمّان بالكامل على الخادم في مسار
  // verify-business (service_role) — لا قبول وهمي، ولا يثق التطبيق بادعاء العميل.
  if (user.store_name && user.status !== 'active') {
    const emailSignal = getBusinessEmailSignal(user)
    if (emailSignal.domainVerified) {
      try {
        const res = await fetch('/api/dabia/verify-business', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName: user.store_name, websiteUrl: user.website_url, userId: user.id }),
        })
        const verify = await res.json()
        if (verify.activated) {
          const fresh = await getUserById(user.id!)
          if (fresh) return fresh
        }
      } catch { /* لا اتصال — نتراجع بأمان للمراجعة اليدوية */ }
    }
  }

  return user
}

export async function getPendingUsers(): Promise<DBUser[]> {
  try { const { data } = await supabase.from('users').select('*').eq('status','pending').order('created_at',{ascending:false}); return (data??[]) as DBUser[] } catch { return [] }
}
// موافقة/رفض الأدمن — عبر دالة موثوقة تتحقق أن المُنفِّذ حسابه admin فعلاً
export async function approveUser(id: string): Promise<DBUser | null> {
  try { const { data, error } = await supabase.rpc('admin_set_user_status', { p_user_id: Number(id), p_status: 'active' }); return error ? null : (data as DBUser) } catch { return null }
}
export async function rejectUser(id: string): Promise<DBUser | null> {
  try { const { data, error } = await supabase.rpc('admin_set_user_status', { p_user_id: Number(id), p_status: 'suspended' }); return error ? null : (data as DBUser) } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════
// يرفق شارة البائع (نوع الحساب) بكل منتج بجلب دفعة واحدة لأنواع حسابات البائعين
// المميّزين. المصدر الوحيد للحقيقة هو عمود users.account_type الذي يضبطه الخادم بعد
// الاشتراك المدفوع — فتظهر العلامة الرسمية/المميّزة على البطاقات فعلياً لا كواجهة.
export async function attachSellerAccountTypes(list: DBProduct[]): Promise<DBProduct[]> {
  const ids = Array.from(new Set(list.map(p => p.seller_user_id).filter(Boolean))) as string[]
  if (ids.length === 0) return list
  try {
    const { data } = await supabase.from('users').select('id, account_type').in('id', ids)
    const byId = new Map((data ?? []).map((u: any) => [String(u.id), u.account_type as DBProduct['seller_account_type']]))
    return list.map(p => ({ ...p, seller_account_type: byId.get(String(p.seller_user_id)) || 'standard' }))
  } catch { return list }
}

export async function getProducts(o: { category?: string; limit?: number; search?: string } = {}): Promise<DBProduct[]> {
  try {
    let q = supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false }).limit(o.limit ?? 50)
    if (o.category) q = q.eq('category', o.category)
    if (o.search)   q = q.ilike('name', `%${o.search}%`)
    const { data } = await q; return await attachSellerAccountTypes((data ?? []) as DBProduct[])
  } catch { return [] }
}
export async function addProduct(d: DBProduct): Promise<DBProduct> {
  const { data, error } = await supabase.from('products').insert({ ...d, active: true }).select().single()
  if (error) throw new Error(error.message); return data as DBProduct
}
// تعديل منتج/خدمة موجودة فعلياً (اسم، سعر، خصم، وصف، صور، مخزون)
export async function updateProduct(id: string, updates: Partial<DBProduct>): Promise<DBProduct | null> {
  try {
    const { data, error } = await supabase.from('products').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) return null
    return data as DBProduct
  } catch { return null }
}
// إيقاف/تفعيل منتج دون حذفه نهائياً (يبقى بسجلات الطلبات القديمة)
export async function toggleProductActive(id: string, active: boolean): Promise<boolean> {
  try { const { error } = await supabase.from('products').update({ active }).eq('id', id); return !error } catch { return false }
}
export async function getProductById(id: string): Promise<DBProduct | null> {
  try {
    const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
    if (!data) return null
    return (await attachSellerAccountTypes([data as DBProduct]))[0]
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS — تقييم نجوم حقيقي: تقييم واحد لكل مستخدم لكل منتج (upsert).
// علامة verified تُحسب في القاعدة (trigger) من وجود طلب حقيقي — لا تُزوَّر من
// العميل. متوسط النجوم وعدد التقييمات يتحدّثان تلقائياً في جدول المنتجات.
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBReview {
  id?:         string
  product_id:  string
  user_id:     string
  username:    string
  rating:      number
  body?:       string
  verified?:   boolean
  created_at?: string
}

export async function addOrUpdateReview(productId: string, userId: string, username: string, rating: number, body?: string): Promise<{ review: DBReview | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .upsert({ product_id: productId, user_id: userId, username, rating, body: body || null }, { onConflict: 'product_id,user_id' })
      .select()
      .single()
    if (error) return { review: null, error: error.message }
    return { review: data as DBReview }
  } catch (e) { return { review: null, error: e instanceof Error ? e.message : 'Failed to save review' } }
}

export async function getProductReviews(productId: string): Promise<DBReview[]> {
  try {
    const { data } = await supabase.from('product_reviews').select('*')
      .eq('product_id', productId).order('created_at', { ascending: false }).limit(50)
    return (data ?? []) as DBReview[]
  } catch { return [] }
}


// ═══════════════════════════════════════════════════════════════════════════════
// TREND ENGINE — ترتيب حيّ من إشارات حقيقية فقط (إعجابات/تعليقات/مشاركات/طلبات/
// تقييمات + حداثة النشر) عبر view في القاعدة يُحسب لحظياً — لا نقاط مخزّنة مزيفة.
// ═══════════════════════════════════════════════════════════════════════════════
export interface TrendScore { product_id: string; likes: number; comments: number; shares: number; orders: number; reviews: number; trend_score: number }

export async function getTrendScores(): Promise<Map<string, TrendScore>> {
  try {
    const { data } = await supabase.from('product_trend_scores').select('*')
    const map = new Map<string, TrendScore>()
    for (const row of (data ?? []) as any[]) {
      map.set(String(row.product_id), { ...row, product_id: String(row.product_id), trend_score: Number(row.trend_score) })
    }
    return map
  } catch { return new Map() }
}

// ── العروض النشطة: منتجات مخفّضة (original_price أعلى) أو عرض محدود لم ينتهِ ──
// يضبطها التاجر بالكامل من صفحة إدارة منتجاته (إضافة/تعديل منتج)
export async function getActiveDeals(limit = 12): Promise<DBProduct[]> {
  try {
    const nowIso = new Date().toISOString()
    const { data } = await supabase.from('products').select('*')
      .eq('active', true)
      .or(`deal_ends_at.gt.${nowIso},and(original_price.not.is.null,original_price.gt.0)`)
      .order('created_at', { ascending: false })
      .limit(limit * 2) // نجلب أكثر ثم نصفّي بدقة (شرط الخصم الحقيقي يحتاج مقارنة عمودين)
    const deals = ((data ?? []) as DBProduct[])
      .filter(p =>
        (p.deal_ends_at && new Date(p.deal_ends_at).getTime() > Date.now()) ||
        (p.original_price != null && p.original_price > p.price)
      )
      .slice(0, limit)
    return await attachSellerAccountTypes(deals)
  } catch { return [] }
}

// أعلى المنتجات رواجاً الآن (منتجات كاملة مرتّبة بنقاط التراند الحقيقية)
export async function getTrendingProducts(limit = 5): Promise<Array<DBProduct & { trend_score: number }>> {
  try {
    const { data: scores } = await supabase.from('product_trend_scores')
      .select('product_id, trend_score').order('trend_score', { ascending: false }).limit(limit)
    const ids = (scores ?? []).map((s: any) => s.product_id)
    if (ids.length === 0) return []
    const { data: products } = await supabase.from('products').select('*').in('id', ids)
    const byId = new Map((products ?? []).map((p: any) => [String(p.id), p]))
    const ranked = (scores ?? [])
      .map((s: any) => { const p = byId.get(String(s.product_id)); return p ? { ...p, trend_score: Number(s.trend_score) } : null })
      .filter(Boolean) as Array<DBProduct & { trend_score: number }>
    return await attachSellerAccountTypes(ranked) as Array<DBProduct & { trend_score: number }>
  } catch { return [] }
}
export async function getProductsBySeller(sid: string): Promise<DBProduct[]> {
  try { const { data } = await supabase.from('products').select('*').eq('seller_user_id', sid).order('created_at',{ascending:false}); return await attachSellerAccountTypes((data??[]) as DBProduct[]) } catch { return [] }
}

// توصيات شخصية حقيقية عبر محرّك الخادم get_recommendations (هجين محتوى + تراند).
// userId فارغ/غير مسجّل → توصيات عامة رائجة (cold start) بنفس الدالة.
export async function getRecommendations(userId?: string, limit = 20): Promise<DBProduct[]> {
  try {
    const { data, error } = await supabase.rpc('get_recommendations', {
      p_user_id: userId ? Number(userId) : null,
      p_limit: limit,
    })
    if (error || !data) return []
    return await attachSellerAccountTypes(data as DBProduct[])
  } catch { return [] }
}

// ── Reels: فيديوهات منتجات قصيرة عمودية (اكتشاف بأسلوب TikTok) ─────────────
export async function getReels(limit = 30): Promise<DBProduct[]> {
  try {
    const { data } = await supabase.from('products').select('*')
      .eq('active', true).not('video_url', 'is', null)
      .order('created_at', { ascending: false }).limit(limit)
    return await attachSellerAccountTypes((data ?? []) as DBProduct[])
  } catch { return [] }
}

// ── مركز النزاعات/الاسترداد ────────────────────────────────────────────────
export interface DBDispute {
  id?: string; order_id: string; buyer_id: string; seller_id?: string
  reason: string; description?: string | null
  status: 'open' | 'resolved' | 'rejected' | 'refunded'
  resolution_note?: string | null; created_at?: string; resolved_at?: string | null
}
export async function openDispute(orderId: string, buyerId: string, reason: string, description?: string): Promise<DBDispute | null> {
  try {
    const { data, error } = await supabase.rpc('open_dispute', { p_order: Number(orderId), p_buyer: Number(buyerId), p_reason: reason, p_desc: description ?? null })
    if (error || !data) return null
    return data as DBDispute
  } catch { return null }
}
export async function resolveDispute(disputeId: string, actorId: string, resolution: 'resolved' | 'rejected' | 'refunded', note?: string): Promise<DBDispute | null> {
  try {
    const { data, error } = await supabase.rpc('resolve_dispute', { p_dispute: Number(disputeId), p_actor: Number(actorId), p_resolution: resolution, p_note: note ?? null })
    if (error || !data) return null
    return data as DBDispute
  } catch { return null }
}
export async function getDisputeForOrder(orderId: string): Promise<DBDispute | null> {
  try { const { data } = await supabase.from('order_disputes').select('*').eq('order_id', orderId).maybeSingle(); return (data as DBDispute) ?? null } catch { return null }
}
export async function getDisputesForSeller(sellerId: string): Promise<DBDispute[]> {
  try { const { data } = await supabase.from('order_disputes').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }); return (data ?? []) as DBDispute[] } catch { return [] }
}

// ── درجة الثقة الحقيقية للبائع (محسوبة من تقييمات/طلبات/نزاعات فعلية) ────────
export interface SellerTrust { score: number; avg_rating: number; reviews_count: number; completed_orders: number; disputes: number }
export async function getSellerTrust(sellerId: string): Promise<SellerTrust | null> {
  try {
    const { data, error } = await supabase.rpc('seller_trust_score', { p_seller: Number(sellerId) })
    if (error || !data || !data[0]) return null
    const r = data[0]
    return { score: Number(r.score), avg_rating: Number(r.avg_rating), reviews_count: Number(r.reviews_count), completed_orders: Number(r.completed_orders), disputes: Number(r.disputes) }
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPS / COMMUNITIES — نظام مجموعات منظّم (خاصة للشركات والحسابات المهمة)
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBGroup {
  id?:            string
  name:           string
  description?:   string | null
  category?:      string | null
  avatar_url?:    string | null
  cover_url?:     string | null
  owner_user_id:  string
  privacy:        'public' | 'private'
  is_official?:   boolean
  member_count?:  number
  created_at?:    string
}
export interface DBGroupMember {
  id?: string; group_id: string; user_id: string
  role: 'owner' | 'admin' | 'member'; status: 'active' | 'pending'
  joined_at?: string
  username?: string; avatar_url?: string // مُدمج عند الجلب
}
export interface DBGroupPost {
  id?: string; group_id: string; user_id: string; username: string
  avatar_url?: string | null; text?: string | null
  product_snapshot?: { id: string; name: string; price: number; image?: string } | null
  created_at?: string
}

export async function getGroups(opts: { search?: string; category?: string; limit?: number } = {}): Promise<DBGroup[]> {
  try {
    let q = supabase.from('groups').select('*').order('member_count', { ascending: false }).limit(opts.limit ?? 50)
    if (opts.category && opts.category !== 'All') q = q.eq('category', opts.category)
    if (opts.search) q = q.ilike('name', `%${opts.search}%`)
    const { data } = await q
    return (data ?? []) as DBGroup[]
  } catch { return [] }
}

export async function getGroupById(id: string): Promise<DBGroup | null> {
  try { const { data } = await supabase.from('groups').select('*').eq('id', id).maybeSingle(); return (data as DBGroup) ?? null } catch { return null }
}

// المجموعات التي ينتمي إليها المستخدم (نشط أو طلب معلّق)
export async function getMyGroups(userId: string): Promise<Array<DBGroup & { my_status: string; my_role: string }>> {
  try {
    const { data: mem } = await supabase.from('group_members').select('group_id, role, status').eq('user_id', userId)
    const rows = (mem ?? []) as { group_id: string; role: string; status: string }[]
    if (rows.length === 0) return []
    const ids = rows.map(r => r.group_id)
    const { data: gs } = await supabase.from('groups').select('*').in('id', ids)
    const byId = new Map(rows.map(r => [String(r.group_id), r]))
    return ((gs ?? []) as DBGroup[]).map(g => {
      const m = byId.get(String(g.id))
      return { ...g, my_status: m?.status ?? 'active', my_role: m?.role ?? 'member' }
    })
  } catch { return [] }
}

export async function createGroup(input: {
  owner_user_id: string; name: string; description?: string; category?: string
  privacy: 'public' | 'private'; avatar_url?: string; cover_url?: string
}): Promise<DBGroup | null> {
  try {
    const { data, error } = await supabase.rpc('create_group', {
      p_owner: Number(input.owner_user_id), p_name: input.name,
      p_description: input.description ?? null, p_category: input.category ?? null,
      p_privacy: input.privacy, p_avatar: input.avatar_url ?? null, p_cover: input.cover_url ?? null,
    })
    if (error || !data) return null
    return data as DBGroup
  } catch { return null }
}

// يعيد حالة العضوية: 'active' | 'pending' | null
export async function getMembership(groupId: string, userId: string): Promise<{ status: string; role: string } | null> {
  try {
    const { data } = await supabase.from('group_members').select('status, role').eq('group_id', groupId).eq('user_id', userId).maybeSingle()
    return data ? { status: (data as any).status, role: (data as any).role } : null
  } catch { return null }
}

export async function joinGroup(groupId: string, userId: string): Promise<'active' | 'pending' | null> {
  try {
    const { data, error } = await supabase.rpc('join_group', { p_group: Number(groupId), p_user: Number(userId) })
    if (error) return null
    return data as 'active' | 'pending'
  } catch { return null }
}

export async function leaveGroup(groupId: string, userId: string): Promise<boolean> {
  try { const { error } = await supabase.rpc('leave_group', { p_group: Number(groupId), p_user: Number(userId) }); return !error } catch { return false }
}

export async function getGroupMembers(groupId: string): Promise<DBGroupMember[]> {
  try {
    const { data } = await supabase.from('group_members').select('*').eq('group_id', groupId).order('joined_at', { ascending: true })
    const rows = (data ?? []) as DBGroupMember[]
    const ids = Array.from(new Set(rows.map(r => r.user_id)))
    if (ids.length) {
      const { data: users } = await supabase.from('users').select('id, username, avatar_url').in('id', ids)
      const byId = new Map((users ?? []).map((u: any) => [String(u.id), u]))
      return rows.map(r => ({ ...r, username: byId.get(String(r.user_id))?.username, avatar_url: byId.get(String(r.user_id))?.avatar_url }))
    }
    return rows
  } catch { return [] }
}

export async function moderateGroupMember(groupId: string, actorId: string, targetId: string, action: 'approve' | 'remove' | 'promote' | 'demote'): Promise<boolean> {
  try { const { error } = await supabase.rpc('group_moderate', { p_group: Number(groupId), p_actor: Number(actorId), p_target: Number(targetId), p_action: action }); return !error } catch { return false }
}

export async function getGroupPosts(groupId: string, limit = 50): Promise<DBGroupPost[]> {
  try { const { data } = await supabase.from('group_posts').select('*').eq('group_id', groupId).order('created_at', { ascending: false }).limit(limit); return (data ?? []) as DBGroupPost[] } catch { return [] }
}

export async function postToGroup(input: {
  group_id: string; user_id: string; username: string; avatar_url?: string
  text?: string; product_snapshot?: DBGroupPost['product_snapshot']
}): Promise<DBGroupPost | null> {
  try {
    const { data, error } = await supabase.rpc('post_to_group', {
      p_group: Number(input.group_id), p_user: Number(input.user_id), p_username: input.username,
      p_avatar: input.avatar_url ?? null, p_text: input.text ?? null, p_snapshot: input.product_snapshot ?? null,
    })
    if (error || !data) return null
    return data as DBGroupPost
  } catch { return null }
}

export async function deleteGroupPost(postId: string, actorId: string): Promise<boolean> {
  try { const { error } = await supabase.rpc('delete_group_post', { p_post: Number(postId), p_actor: Number(actorId) }); return !error } catch { return false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE STREAMING COMMERCE — بث مباشر حقيقي للتجار (Supabase Realtime)
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBLiveStream {
  id?:           string
  host_user_id:  string
  host_username: string
  title:         string
  description?:  string | null
  cover_image?:  string | null
  status?:       'scheduled' | 'live' | 'ended'
  scheduled_at?: string | null
  started_at?:   string | null
  ended_at?:     string | null
  viewer_count?: number
  created_at?:   string
}
export interface DBStreamProduct {
  id?:            string
  stream_id:      string
  product_id:     string
  pinned?:        boolean
  special_price?: number | null
  offer_ends_at?: string | null
  created_at?:    string
  product?:       DBProduct // مُدمج عند الجلب
}
export interface DBStreamComment { id?: string; stream_id: string; user_id?: string | null; username: string; text: string; created_at?: string }

// جدولة/إنشاء بث (تاجر). status='scheduled' مع موعد، أو 'live' للبدء الفوري
export async function createStream(s: Omit<DBLiveStream, 'id' | 'created_at' | 'viewer_count'>): Promise<DBLiveStream | null> {
  try {
    const { data, error } = await supabase.from('live_streams').insert(s).select().single()
    if (error) return null
    const stream = data as DBLiveStream
    // نشر تلقائي على صفحة الاجتماعي عند بدء بث مباشر فوراً (كل ما في الفضاء يظهر بالاجتماعي)
    if (stream.status === 'live') { crossPostToSocial(stream.host_user_id, stream.host_username, `🔴 Live now: "${stream.title}" — join on Space`) }
    return stream
  } catch { return null }
}

// نشر تلقائي موحّد من الفضاء إلى الاجتماعي (بث/مزاد/إعلان…) — منشور رسمي في الفيد
async function crossPostToSocial(userId: string, username: string, text: string): Promise<void> {
  try { await supabase.from('posts').insert({ user_id: userId, username, type: 'announcement', text, is_official: true }) } catch {}
}
export async function updateStream(id: string, updates: Partial<DBLiveStream>): Promise<DBLiveStream | null> {
  try {
    const { data, error } = await supabase.from('live_streams').update(updates).eq('id', id).select().single()
    if (error) return null
    return data as DBLiveStream
  } catch { return null }
}
export async function startStream(id: string): Promise<DBLiveStream | null> {
  const s = await updateStream(id, { status: 'live', started_at: new Date().toISOString() })
  // بثّ مجدول انطلق الآن → نشر تلقائي على الاجتماعي
  if (s) crossPostToSocial(s.host_user_id, s.host_username, `🔴 Live now: "${s.title}" — join on Space`)
  return s
}
export async function endStream(id: string): Promise<DBLiveStream | null> {
  return updateStream(id, { status: 'ended', ended_at: new Date().toISOString() })
}
export async function getLiveStreams(): Promise<DBLiveStream[]> {
  try { const { data } = await supabase.from('live_streams').select('*').eq('status', 'live').order('started_at', { ascending: false }); return (data ?? []) as DBLiveStream[] } catch { return [] }
}
export async function getUpcomingStreams(): Promise<DBLiveStream[]> {
  try {
    const { data } = await supabase.from('live_streams').select('*')
      .eq('status', 'scheduled').gte('scheduled_at', new Date(Date.now() - 3600000).toISOString())
      .order('scheduled_at', { ascending: true }).limit(20)
    return (data ?? []) as DBLiveStream[]
  } catch { return [] }
}
export async function getStreamById(id: string): Promise<DBLiveStream | null> {
  try { const { data } = await supabase.from('live_streams').select('*').eq('id', id).maybeSingle(); return data as DBLiveStream | null } catch { return null }
}
export async function setViewerCount(id: string, count: number): Promise<void> {
  try { await supabase.from('live_streams').update({ viewer_count: count }).eq('id', id) } catch {}
}

// منتجات البث + العرض المميز
export async function addStreamProduct(streamId: string, productId: string, specialPrice?: number, offerEndsAt?: string): Promise<DBStreamProduct | null> {
  try {
    const { data, error } = await supabase.from('stream_products')
      .upsert({ stream_id: streamId, product_id: productId, special_price: specialPrice ?? null, offer_ends_at: offerEndsAt ?? null }, { onConflict: 'stream_id,product_id' })
      .select().single()
    if (error) return null
    return data as DBStreamProduct
  } catch { return null }
}
export async function removeStreamProduct(id: string): Promise<boolean> {
  try { const { error } = await supabase.from('stream_products').delete().eq('id', id); return !error } catch { return false }
}
// تثبيت منتج واحد فقط على الشاشة (يلغي تثبيت البقية)
export async function pinStreamProduct(streamId: string, streamProductId: string): Promise<boolean> {
  try {
    await supabase.from('stream_products').update({ pinned: false }).eq('stream_id', streamId)
    const { error } = await supabase.from('stream_products').update({ pinned: true }).eq('id', streamProductId)
    return !error
  } catch { return false }
}
export async function getStreamProducts(streamId: string): Promise<DBStreamProduct[]> {
  try {
    const { data } = await supabase.from('stream_products').select('*').eq('stream_id', streamId).order('created_at', { ascending: true })
    const rows = (data ?? []) as DBStreamProduct[]
    const ids = rows.map(r => r.product_id)
    if (ids.length === 0) return rows
    const { data: products } = await supabase.from('products').select('*').in('id', ids)
    const byId = new Map((products ?? []).map((p: any) => [String(p.id), p as DBProduct]))
    return rows.map(r => ({ ...r, product: byId.get(String(r.product_id)) }))
  } catch { return [] }
}

// تعليقات البث
export async function addStreamComment(streamId: string, userId: string | null, username: string, text: string): Promise<DBStreamComment | null> {
  try {
    const { data, error } = await supabase.from('stream_comments').insert({ stream_id: streamId, user_id: userId, username, text }).select().single()
    if (error) return null
    return data as DBStreamComment
  } catch { return null }
}
export async function getStreamComments(streamId: string): Promise<DBStreamComment[]> {
  try { const { data } = await supabase.from('stream_comments').select('*').eq('stream_id', streamId).order('created_at', { ascending: true }).limit(200); return (data ?? []) as DBStreamComment[] } catch { return [] }
}

// حجز/طلب أثناء البث
export async function addStreamReservation(streamId: string, productId: string, userId: string, username: string, kind: 'reserve' | 'order'): Promise<boolean> {
  try { const { error } = await supabase.from('stream_reservations').insert({ stream_id: streamId, product_id: productId, user_id: userId, username, kind }); return !error } catch { return false }
}
export async function getStreamReservationCount(streamId: string): Promise<number> {
  try { const { count } = await supabase.from('stream_reservations').select('*', { count: 'exact', head: true }).eq('stream_id', streamId); return count ?? 0 } catch { return 0 }
}
export async function deleteProduct(id: string): Promise<boolean> {
  try { const { error } = await supabase.from('products').delete().eq('id', id); return !error } catch { return false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION — تأكيد البريد برمز حقيقي عبر Supabase Auth
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال رمز التحقق (OTP) إلى البريد الحقيقي عبر نظام Supabase Auth المدمج
export async function sendVerificationCode(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }, // يسمح بإرسال الرمز حتى لو الإيميل غير مسجّل في auth بعد
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to send code' }
  }
}

// التحقق من الرمز المُدخل من المستخدم مقابل ما أرسله Supabase
export async function verifyEmailCode(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    if (error) return { ok: false, error: error.message }
    if (!data.session && !data.user) return { ok: false, error: 'Invalid or expired code' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Verification failed' }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET — إعادة تعيين كلمة السر برمز حقيقي عبر Supabase Auth
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال رمز إعادة تعيين كلمة السر للبريد الحقيقي
export async function sendPasswordResetCode(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }, // فقط لمستخدم موجود بالفعل
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to send code' }
  }
}

// التحقق من رمز إعادة التعيين، ثم تحديث كلمة السر في جدول users نفسه
export async function resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) return { ok: false, error: error.message }
    if (!data.session && !data.user) return { ok: false, error: 'Invalid or expired code' }

    // تحديث كلمة السر في جدول users (المصدر الذي يستخدمه التطبيق فعلياً للتحقق)
    const user = await getUserByEmail(email)
    if (!user?.id) return { ok: false, error: 'Account not found' }
    const updated = await updateUser(user.id, { password: await hashPassword(newPassword) })
    if (!updated) return { ok: false, error: 'Failed to update password' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Reset failed' }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS — نظام تتبع طلبات حقيقي وكامل (مشتري + بائع) مثل التطبيقات العالمية
// ═══════════════════════════════════════════════════════════════════════════════
export const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'] as const

export async function createOrder(d: DBOrder): Promise<DBOrder> {
  const { data, error } = await supabase.from('orders').insert({ ...d, status: d.status || 'confirmed' }).select().single()
  if (error) throw new Error(error.message)
  // خصم المخزون يتم تلقائياً في القاعدة عبر trigger عند إدراج الطلب
  // (لم يعد العميل يكتب عمود stock مباشرة — جدول المنتجات مقفل على المالك).
  return data as DBOrder
}

// طلبات المشتري — يتابع كل مشترياته
export async function getOrdersByBuyer(bid: string): Promise<DBOrder[]> {
  try {
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', bid).order('created_at',{ascending:false}).limit(50)
    if (error) return []
    return (data??[]) as DBOrder[]
  } catch { return [] }
}

// طلبات البائع — يتابع كل ما بِيع من متجره ويُحدّث حالته
export async function getOrdersBySeller(sellerId: string): Promise<DBOrder[]> {
  try {
    const { data, error } = await supabase.from('orders').select('*').eq('seller_user_id', sellerId).order('created_at',{ascending:false}).limit(100)
    if (error) return []
    return (data??[]) as DBOrder[]
  } catch { return [] }
}

export async function getOrderById(id: string): Promise<DBOrder | null> {
  try { const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle(); return data as DBOrder | null } catch { return null }
}

// البائع يُحدّث حالة الطلب (قيد التحضير → شُحن → تم التسليم) — تتبع حقيقي.
// عند الشحن يمكنه إرفاق شركة الشحن ورقم التتبّع الخارجي (يُحفظان في سجل الحالة).
export async function updateOrderStatus(orderId: string, status: DBOrder['status'], opts?: { note?: string; carrier?: string; tracking_number?: string }): Promise<boolean> {
  try {
    const payload: any = { status, updated_at: new Date().toISOString() }
    if (opts?.note)            payload.tracking_note   = opts.note
    if (opts?.carrier)         payload.carrier         = opts.carrier
    if (opts?.tracking_number) payload.tracking_number = opts.tracking_number
    const { error } = await supabase.from('orders').update(payload).eq('id', orderId)
    return !error
  } catch { return false }
}

// المشتري يؤكّد استلام الطلب — إغلاق آمن للطرفين. عند التأكيد يُحرَّر مبلغ
// الضمان للبائع (escrow released). لا يُحرَّر المال إلا بتأكيد المشتري.
export async function confirmOrderReceived(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('orders').update({
      status: 'delivered',
      escrow_status: 'released',
      escrow_released_at: new Date().toISOString(),
      tracking_note: 'Receipt confirmed by buyer — payment released to seller',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)
    return !error
  } catch { return false }
}

// تتبّع طلب برقمه — متاح للطرفين لمتابعة الشحنة
export async function getOrderByNumber(orderNumber: string): Promise<DBOrder | null> {
  try { const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber.trim().toUpperCase()).maybeSingle(); return data as DBOrder | null } catch { return null }
}

// المشتري يطلب إلغاء/استرداد — يُعاد مبلغ الضمان المحتجز للمشتري (escrow refunded)
export async function requestOrderCancellation(orderId: string, reason: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('orders').update({
      status: 'cancelled',
      escrow_status: 'refunded',
      tracking_note: `Cancelled by buyer: ${reason}`,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)
    return !error
  } catch { return false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — إشعارات حقيقية مبنية على أحداث فعلية للمستخدم (لا بيانات ثابتة)
// ═══════════════════════════════════════════════════════════════════════════════
export interface RealNotif {
  id: string; type: string; title: string; body: string; time: string; read: boolean; link?: string
}

export async function getRealNotifications(userId: string): Promise<RealNotif[]> {
  try {
    const notifs: RealNotif[] = []

    // 1) الإشعارات المحفوظة (أحداث فعلية: متابعة/رسالة/نزاع/طلب/منشور) — المصدر
    // الأساسي، بحالة "مقروء" حقيقية محفوظة في القاعدة.
    try {
      const { data: persisted } = await supabase.rpc('get_notifications', { p_me: Number(userId), p_limit: 60 })
      ;(persisted as any[] ?? []).forEach(n => notifs.push({
        id: `db-${n.id}`, type: n.type, title: n.title, body: n.body || "",
        time: n.created_at, read: n.read, link: n.link || undefined,
      }))
    } catch {}

    // 2) تنبيه حالة الحساب (تحت المراجعة) — حالة قائمة، إعلامية (لا تُحتسب كغير مقروءة)
    const user = await getUserById(userId)
    if (user?.status === "pending") {
      notifs.push({
        id: "account-pending", type: "account",
        title: "Account Under Review",
        body: `Your ${user.role} account is being verified. We'll notify you once approved.`,
        time: user.created_at || new Date().toISOString(), read: true, link: "/account",
      })
    }

    // 3) تنبيهات انخفاض السعر — منتج حفظته أصبح الآن ضمن تخفيض/عرض محدود (إعلامية)
    const now = Date.now()
    const saved = await getSavedProducts(userId)
    saved.forEach(p => {
      const dealActive = !!p.deal_ends_at && new Date(p.deal_ends_at).getTime() > now
      const discounted = p.original_price != null && p.original_price > p.price
      if (!dealActive && !discounted) return
      const pct = discounted ? Math.round((1 - p.price / (p.original_price as number)) * 100) : null
      notifs.push({
        id: `deal-${p.id}`, type: "deal",
        title: pct ? `Price drop · ${pct}% off` : "Limited-time offer",
        body: `"${p.name}" you saved is now ${p.price}π${discounted ? ` (was ${p.original_price}π)` : ""}.`,
        time: p.updated_at || p.deal_ends_at || new Date().toISOString(), read: true,
      })
    })

    // ترتيب الأحدث أولاً
    notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    return notifs
  } catch { return [] }
}

// ── بلاغات المحتوى (إساءة/كراهية/احتيال) ──────────────────────────────────
export interface DBReport {
  id?: string; reporter_id: string; target_type: 'post' | 'user' | 'product'; target_id: string
  reason: string; description?: string | null; status?: string; created_at?: string
}
export async function reportContent(reporterId: string, targetType: 'post' | 'user' | 'product', targetId: string, reason: string, description?: string): Promise<boolean> {
  try { const { error } = await supabase.rpc('report_content', { p_reporter: Number(reporterId), p_type: targetType, p_target: String(targetId), p_reason: reason, p_desc: description ?? null }); return !error } catch { return false }
}
export async function adminListReports(adminId: string): Promise<DBReport[]> {
  try { const { data, error } = await supabase.rpc('admin_list_reports', { p_admin: Number(adminId) }); if (error || !data) return []; return data as DBReport[] } catch { return [] }
}
export async function adminResolveReport(adminId: string, reportId: string, status: 'reviewed' | 'actioned' | 'dismissed', deleteTarget = false): Promise<boolean> {
  try { const { error } = await supabase.rpc('admin_resolve_report', { p_admin: Number(adminId), p_report: Number(reportId), p_status: status, p_delete_target: deleteTarget }); return !error } catch { return false }
}

// عدد الإشعارات غير المقروءة (المحفوظة فقط) — لشارة الجرس
export async function getNotificationsUnread(userId: string): Promise<number> {
  try { const { data } = await supabase.rpc('notifications_unread', { p_me: Number(userId) }); return Number(data) || 0 } catch { return 0 }
}
// تعليم كل الإشعارات كمقروءة عند فتح اللوحة
export async function markNotificationsRead(userId: string): Promise<void> {
  try { await supabase.rpc('mark_notifications_read', { p_me: Number(userId) }) } catch {}
}
// ملاحظة: تعريف updateOrderStatus القديم (id, status, pi_tx_id) حُذف — استُبدل
// بالنسخة الأحدث أعلاه (orderId, status, note) التي تدعم كامل تتبع الطلبات

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET — محفظة حقيقية
// ═══════════════════════════════════════════════════════════════════════════════
export async function getWalletBalance(userId: string): Promise<number> {
  try {
    const { data } = await supabase.from('users').select('wallet_balance').eq('id', userId).single()
    return (data as any)?.wallet_balance ?? 0
  } catch { return 0 }
}

// تسجيل معاملة محفظة + تحديث الرصيد ذرّياً عبر دالة موثوقة في القاعدة.
// لم يعد التطبيق يكتب wallet_balance مباشرة (حارس القاعدة يمنع ذلك)، فالرصيد
// لا يمكن العبث به من الواجهة. تتطلب جلسة مصادقة صاحب الحساب.
export async function addWalletTransaction(tx: DBWalletTransaction): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('apply_wallet_tx', {
      p_user_id:     Number(tx.user_id),
      p_type:        tx.type,
      p_amount:      tx.amount,
      p_description: tx.description,
      p_pi_tx_id:    tx.pi_tx_id ?? null,
    })
    return !error
  } catch { return false }
}

export async function getWalletTransactions(userId: string): Promise<DBWalletTransaction[]> {
  try {
    const { data } = await supabase.from('wallet_transactions').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
    return (data ?? []) as DBWalletTransaction[]
  } catch { return [] }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE — رفع الملفات
// ═══════════════════════════════════════════════════════════════════════════════
export async function uploadProductImage(file: File, userId: string): Promise<{ url: string | null; error?: string }> {
  try {
    if (file.size > 8 * 1024 * 1024) return { url: null, error: "Image too large (max 8MB)" }
    const ext  = file.name.split('.').pop()
    const path = `products/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('dabia-media').upload(path, file, {
      cacheControl: '3600', upsert: false
    })
    if (error) return { url: null, error: error.message }
    const { data } = supabase.storage.from('dabia-media').getPublicUrl(path)
    return { url: data.publicUrl }
  } catch (e) { return { url: null, error: e instanceof Error ? e.message : 'Upload failed' } }
}

export async function uploadProductVideo(file: File, userId: string): Promise<{ url: string | null; error?: string }> {
  try {
    if (file.size > 50 * 1024 * 1024) return { url: null, error: 'Video too large (max 50MB)' }
    const ext  = file.name.split('.').pop()
    const path = `videos/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('dabia-media').upload(path, file, {
      cacheControl: '3600', upsert: false
    })
    if (error) return { url: null, error: error.message }
    const { data } = supabase.storage.from('dabia-media').getPublicUrl(path)
    return { url: data.publicUrl }
  } catch (e) { return { url: null, error: e instanceof Error ? e.message : 'Upload failed' } }
}

// رفع/تحديث صورة البروفايل — مسار ثابت لكل مستخدم (upsert) لاستبدالها بسهولة عند التغيير
export async function uploadProfilePicture(file: File, userId: string): Promise<{ url: string | null; error?: string }> {
  try {
    if (file.size > 5 * 1024 * 1024) return { url: null, error: 'Image too large (max 5MB)' }
    const ext  = file.name.split('.').pop()
    const path = `avatars/${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('dabia-media').upload(path, file, {
      cacheControl: '3600', upsert: true // upsert: يسمح باستبدال الصورة القديمة بنفس المسار
    })
    if (error) return { url: null, error: error.message }
    const { data } = supabase.storage.from('dabia-media').getPublicUrl(path)
    // إضافة طابع زمني لتجنب الكاش القديم للصورة في المتصفح بعد التحديث
    return { url: `${data.publicUrl}?t=${Date.now()}` }
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSTS — نظام منشورات حقيقي: نشر منتج، منشور نصي/صورة، استفتاء
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBPoll {
  question: string
  options: { text: string; votes: number }[]
}

export interface DBPost {
  id?:           string
  user_id:       string
  username:      string
  avatar_url?:   string
  role?:         string
  type:          'product_share' | 'text' | 'poll' | 'announcement'
  text?:         string
  product_id?:   string
  product_snapshot?: { name: string; price: number; image?: string }
  poll?:         DBPoll
  pinned?:       boolean
  is_official?:  boolean
  account_type?: 'standard' | 'premium' | 'official' // شارة الكاتب — تُرفق عند الجلب
  reposted_from?: string
  reposted_from_username?: string
  created_at?:   string
}

// يرفق شارة الكاتب (نوع الحساب) بكل منشور — نفس منطق المنتجات، مصدر واحد للحقيقة
async function attachAuthorAccountTypes(posts: DBPost[]): Promise<DBPost[]> {
  const ids = Array.from(new Set(posts.map(p => p.user_id).filter(Boolean)))
  if (ids.length === 0) return posts
  try {
    const { data } = await supabase.from('users').select('id, account_type').in('id', ids)
    const byId = new Map((data ?? []).map((u: any) => [String(u.id), u.account_type as DBPost['account_type']]))
    return posts.map(p => ({ ...p, account_type: byId.get(String(p.user_id)) || 'standard' }))
  } catch { return posts }
}

// إعلان رسمي من متجر/شركة — يصل كإشعار حقيقي لكل متابعي هذا الحساب
export async function createAnnouncement(userId: string, username: string, text: string, isOfficial = true): Promise<DBPost | null> {
  try {
    const row = { user_id: userId, username, type: 'announcement', text, is_official: isOfficial, pinned: true }
    const { data, error } = await supabase.from('posts').insert(row).select().single()
    if (error) return null
    return data as DBPost
  } catch { return null }
}

// نشر منتج حقيقي من المتجر إلى التاب الاجتماعي
export async function sharePostFromProduct(userId: string, username: string, product: { id: string; name: string; price: number; image?: string }, caption?: string): Promise<DBPost | null> {
  try {
    const row = {
      user_id: userId, username, type: 'product_share',
      text: caption || '', product_id: product.id,
      product_snapshot: { name: product.name, price: product.price, image: product.image },
    }
    const { data, error } = await supabase.from('posts').insert(row).select().single()
    if (error) return null
    return data as DBPost
  } catch { return null }
}

// منشور نصي عادي (حساب فردي/تاجر/شركة)
export async function createTextPost(userId: string, username: string, text: string, avatarUrl?: string, isOfficial = false): Promise<DBPost | null> {
  try {
    const row = { user_id: userId, username, avatar_url: avatarUrl, type: 'text', text, is_official: isOfficial }
    const { data, error } = await supabase.from('posts').insert(row).select().single()
    if (error) return null
    return data as DBPost
  } catch { return null }
}

// استفتاء حقيقي
export async function createPoll(userId: string, username: string, question: string, options: string[]): Promise<DBPost | null> {
  try {
    const row = {
      user_id: userId, username, type: 'poll',
      poll: { question, options: options.map(o => ({ text: o, votes: 0 })) },
    }
    const { data, error } = await supabase.from('posts').insert(row).select().single()
    if (error) return null
    return data as DBPost
  } catch { return null }
}

// التصويت عبر دالة موثوقة (المصوّت ليس صاحب المنشور، والجدول مقفل على المالك)
export async function votePoll(postId: string, optionIndex: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('vote_poll', { p_post_id: Number(postId), p_option: optionIndex })
    return !error && data === true
  } catch { return false }
}

export async function getFeedPosts(limit = 50): Promise<DBPost[]> {
  try {
    const { data } = await supabase.from('posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(limit)
    return await attachAuthorAccountTypes((data ?? []) as DBPost[])
  } catch { return [] }
}

export async function getPostsByUser(userId: string): Promise<DBPost[]> {
  try {
    const { data } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    return await attachAuthorAccountTypes((data ?? []) as DBPost[])
  } catch { return [] }
}

export async function togglePinPost(postId: string, pinned: boolean): Promise<boolean> {
  try { const { error } = await supabase.from('posts').update({ pinned }).eq('id', postId); return !error } catch { return false }
}

// ── نظام المتابعة (Follow) ────────────────────────────────────────────────
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  try { const { error } = await supabase.rpc('follow_user', { p_follower: Number(followerId), p_following: Number(followingId) }); return !error } catch { return false }
}
export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  try { const { error } = await supabase.rpc('unfollow_user', { p_follower: Number(followerId), p_following: Number(followingId) }); return !error } catch { return false }
}
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try { const { data } = await supabase.from('follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle(); return !!data } catch { return false }
}
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  try {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    ])
    return { followers: followers ?? 0, following: following ?? 0 }
  } catch { return { followers: 0, following: 0 } }
}
// مجموعة معرّفات مَن يتابعهم المستخدم — لعرض حالة "متابَع" على البطاقات دفعة واحدة
export async function getFollowingSet(followerId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', followerId)
    return new Set((data ?? []).map((r: any) => String(r.following_id)))
  } catch { return new Set() }
}

export interface FollowPerson {
  user_id: string; username: string; avatar_url?: string | null; account_type?: string | null
  store_name?: string | null; viewer_follows: boolean; notify?: boolean; created_at?: string
}
export async function getFollowers(userId: string, viewerId?: string): Promise<FollowPerson[]> {
  try {
    const { data, error } = await supabase.rpc('list_followers', { p_user: Number(userId), p_viewer: viewerId ? Number(viewerId) : null })
    if (error || !data) return []
    return (data as any[]).map(r => ({ ...r, user_id: String(r.user_id) }))
  } catch { return [] }
}
export async function getFollowing(userId: string, viewerId?: string): Promise<FollowPerson[]> {
  try {
    const { data, error } = await supabase.rpc('list_following', { p_user: Number(userId), p_viewer: viewerId ? Number(viewerId) : null })
    if (error || !data) return []
    return (data as any[]).map(r => ({ ...r, user_id: String(r.user_id) }))
  } catch { return [] }
}
export async function setFollowNotify(followerId: string, followingId: string, notify: boolean): Promise<boolean> {
  try { const { error } = await supabase.rpc('set_follow_notify', { p_follower: Number(followerId), p_following: Number(followingId), p_notify: notify }); return !error } catch { return false }
}
export async function getFollowNotify(followerId: string, followingId: string): Promise<boolean> {
  try { const { data } = await supabase.from('follows').select('notify').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle(); return !!(data as any)?.notify } catch { return false }
}

// ── محادثة مباشرة (DM) — خاصّة عبر دوال تتحقّق من طرفَي المحادثة ────────────
export interface DBDMMessage { id?: string; thread_id: string; sender_id: string; text: string; created_at?: string }
export interface DBDMThread {
  thread_id: string; other_id: string; other_username: string; other_avatar?: string | null
  other_account_type?: string | null; last_text?: string | null; last_at?: string | null
  last_sender?: string | null; unread?: boolean
}

export async function openDMThread(meId: string, otherId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('dm_open_thread', { p_me: Number(meId), p_other: Number(otherId) })
    if (error || data == null) return null
    return String(data)
  } catch { return null }
}
export async function sendDM(threadId: string, senderId: string, text: string): Promise<DBDMMessage | null> {
  try {
    const { data, error } = await supabase.rpc('dm_send', { p_thread: Number(threadId), p_sender: Number(senderId), p_text: text })
    if (error || !data) return null
    return data as DBDMMessage
  } catch { return null }
}
export async function getDMMessages(threadId: string, meId: string, after?: string): Promise<DBDMMessage[]> {
  try {
    const { data, error } = await supabase.rpc('dm_get_messages', { p_thread: Number(threadId), p_me: Number(meId), p_after: after ?? null })
    if (error || !data) return []
    return data as DBDMMessage[]
  } catch { return [] }
}
export async function listDMThreads(meId: string): Promise<DBDMThread[]> {
  try {
    const { data, error } = await supabase.rpc('dm_list_threads', { p_me: Number(meId) })
    if (error || !data) return []
    return (data as any[]).map(r => ({
      thread_id: String(r.thread_id), other_id: String(r.other_id), other_username: r.other_username,
      other_avatar: r.other_avatar, other_account_type: r.other_account_type, last_text: r.last_text,
      last_at: r.last_at, last_sender: r.last_sender != null ? String(r.last_sender) : null, unread: r.unread,
    }))
  } catch { return [] }
}
export async function markDMRead(threadId: string, meId: string): Promise<void> {
  try { await supabase.rpc('dm_mark_read', { p_thread: Number(threadId), p_me: Number(meId) }) } catch {}
}
export async function getDMUnreadCount(meId: string): Promise<number> {
  try { const { data } = await supabase.rpc('dm_unread_count', { p_me: Number(meId) }); return Number(data) || 0 } catch { return 0 }
}

// خلاصة اجتماعية بأسلوب TikTok: 'foryou' (خوارزمية) أو 'following' (من تتابعهم)
export async function getSocialFeed(scope: 'foryou' | 'following', userId?: string, limit = 60): Promise<DBPost[]> {
  try {
    const { data, error } = await supabase.rpc('get_social_feed', {
      p_user: userId ? Number(userId) : null, p_scope: scope, p_limit: limit,
    })
    if (error || !data) return []
    return await attachAuthorAccountTypes(data as DBPost[])
  } catch { return [] }
}

export async function deletePost(postId: string): Promise<boolean> {
  try { const { error } = await supabase.from('posts').delete().eq('id', postId); return !error } catch { return false }
}
// تعديل نص منشور/إعلان (لصاحبه — يُتحقق في الواجهة)
export async function updatePost(postId: string, text: string): Promise<boolean> {
  try { const { error } = await supabase.from('posts').update({ text }).eq('id', postId); return !error } catch { return false }
}

// حفظ منشور/إعلان — نفس منطق حفظ المنتجات لكن للمنشورات
export async function toggleSavePost(userId: string, postId: string): Promise<{ saved: boolean }> {
  try {
    const { data: existing } = await supabase.from('saved_posts').select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle()
    if (existing) { await supabase.from('saved_posts').delete().eq('id', existing.id); return { saved: false } }
    await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId })
    return { saved: true }
  } catch { return { saved: false } }
}
export async function isPostSaved(userId: string, postId: string): Promise<boolean> {
  try { const { data } = await supabase.from('saved_posts').select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle(); return !!data } catch { return false }
}
export async function getSavedPosts(userId: string): Promise<DBPost[]> {
  try {
    const { data: saves } = await supabase.from('saved_posts').select('post_id').eq('user_id', userId).order('created_at', { ascending: false })
    if (!saves?.length) return []
    const ids = saves.map((s: any) => s.post_id)
    const { data: posts } = await supabase.from('posts').select('*').in('id', ids)
    return (posts ?? []) as DBPost[]
  } catch { return [] }
}

// إعادة نشر منشور ناجح — ينشئ منشوراً جديداً يشير للأصلي، يظهر في فيد الناشر الجديد
export async function repostPost(originalPost: DBPost, repostUserId: string, repostUsername: string): Promise<DBPost | null> {
  try {
    const row: any = {
      user_id: repostUserId, username: repostUsername, type: originalPost.type,
      text: originalPost.text, product_id: originalPost.product_id,
      product_snapshot: originalPost.product_snapshot, poll: null, // الاستفتاءات لا تُعاد نشرها بأصواتها لتفادي الالتباس
      reposted_from: originalPost.id, reposted_from_username: originalPost.username,
    }
    const { data, error } = await supabase.from('posts').insert(row).select().single()
    if (error) return null
    return data as DBPost
  } catch { return null }
}

// هل أعاد هذا المستخدم نشر هذا المنشور؟ (لعرض حالة الزر: نشر/تراجع)
export async function hasReposted(originalPostId: string, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('posts').select('id')
      .eq('user_id', userId).eq('reposted_from', Number(originalPostId)).limit(1).maybeSingle()
    return !!data
  } catch { return false }
}
// التراجع عن إعادة النشر — يحذف منشور إعادة النشر الخاص بالمستخدم
export async function undoRepost(originalPostId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('posts').delete()
      .eq('user_id', userId).eq('reposted_from', Number(originalPostId))
    return !error
  } catch { return false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVED PRODUCTS — منتجات محفوظة حقيقية بـ Supabase (تحل محل النسخة الوهمية
// السابقة التي كانت تحفظ فقط في localStorage بدون أي اتصال بقاعدة البيانات)
// ═══════════════════════════════════════════════════════════════════════════════
export async function toggleSaveProduct(userId: string, productId: string): Promise<{ saved: boolean }> {
  try {
    const { data: existing } = await supabase.from('saved_products').select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle()
    if (existing) {
      await supabase.from('saved_products').delete().eq('id', existing.id)
      return { saved: false }
    }
    await supabase.from('saved_products').insert({ user_id: userId, product_id: productId })
    return { saved: true }
  } catch { return { saved: false } }
}

export async function isProductSaved(userId: string, productId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('saved_products').select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle()
    return !!data
  } catch { return false }
}

export async function getSavedProducts(userId: string): Promise<DBProduct[]> {
  try {
    const { data: saves } = await supabase.from('saved_products').select('product_id').eq('user_id', userId).order('created_at', { ascending: false })
    if (!saves?.length) return []
    const ids = saves.map((s: any) => s.product_id)
    const { data: products } = await supabase.from('products').select('*').in('id', ids)
    return (products ?? []) as DBProduct[]
  } catch { return [] }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENTIONS — إشارة لمستخدم/متجر في التعليقات + إشعار حقيقي
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBMention { id?: string; mentioned_user_id: string; mentioning_user_id: string; mentioning_username: string; context_text: string; post_id?: string; read: boolean; created_at?: string }

export async function createMentionNotification(m: Omit<DBMention, 'id' | 'created_at' | 'read'>): Promise<boolean> {
  try { const { error } = await supabase.from('mentions').insert({ ...m, read: false }); return !error } catch { return false }
}

export async function getMentionsForUser(userId: string): Promise<DBMention[]> {
  try {
    const { data } = await supabase.from('mentions').select('*').eq('mentioned_user_id', userId).order('created_at', { ascending: false }).limit(30)
    return (data ?? []) as DBMention[]
  } catch { return [] }
}

// يستخرج كل @username من نص ويُنشئ إشعار إشارة حقيقي لكل واحد موجود فعلياً
export async function processMentions(text: string, fromUserId: string, fromUsername: string, postId?: string): Promise<void> {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g)
  if (!matches) return
  for (const m of matches) {
    const uname = m.slice(1)
    try {
      const { data: target } = await supabase.from('users').select('id').eq('username', uname).maybeSingle()
      if (target?.id && target.id !== fromUserId) {
        await createMentionNotification({
          mentioned_user_id: target.id, mentioning_user_id: fromUserId,
          mentioning_username: fromUsername, context_text: text.slice(0, 200), post_id: postId,
        })
      }
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUCTIONS — مزاد حقيقي بمزايدات لحظية حقيقية عبر Supabase (بدون فيديو/بث مباشر)
// ⚠️ صراحة تقنية: بث فيديو حي + LL-HLS/WebRTC يتطلب خادم بث مخصص (مثل Amazon IVS
// أو OvenMediaEngine) خارج نطاق Pi App Studio بالكامل. هذا النظام يبني المزاد
// النصي/الصوري الحقيقي بالمزايدات اللحظية فقط — وهو الجزء القابل للتنفيذ فعلياً.
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBAuction {
  id?:            string
  seller_user_id: string
  seller_name:    string
  product_name:   string
  description?:   string
  image?:         string
  starting_price: number
  current_bid:    number
  min_increment:  number
  reserve_price?: number
  status:         'scheduled' | 'live' | 'ended' | 'cancelled'
  starts_at?:     string
  ends_at:        string
  winner_user_id?: string
  created_at?:    string
}

export interface DBAuctionBid {
  id?:         string
  auction_id:  string
  bidder_id:   string
  bidder_name: string
  amount:      number
  created_at?: string
}

export async function createAuction(a: Omit<DBAuction, 'id' | 'current_bid' | 'status' | 'created_at'>): Promise<DBAuction | null> {
  try {
    const row = { ...a, current_bid: a.starting_price, status: 'live' as const }
    const { data, error } = await supabase.from('auctions').insert(row).select().single()
    if (error) return null
    const auction = data as DBAuction
    // نشر تلقائي على الاجتماعي: مزاد جديد بدأ
    crossPostToSocial(auction.seller_user_id, auction.seller_name, `🔨 New auction: "${auction.product_name}" starting at ${auction.starting_price}π — bid on Space`)
    return auction
  } catch { return null }
}

export async function getLiveAuctions(): Promise<DBAuction[]> {
  try {
    const { data } = await supabase.from('auctions').select('*').eq('status', 'live').order('ends_at', { ascending: true })
    return (data ?? []) as DBAuction[]
  } catch { return [] }
}

export async function getAuctionById(id: string): Promise<DBAuction | null> {
  try { const { data } = await supabase.from('auctions').select('*').eq('id', id).maybeSingle(); return data as DBAuction | null } catch { return null }
}

// مزايدة حقيقية مع تحقق صارم من السعر (يمنع المزايدة المزيّفة من جهة العميل)
export async function placeBid(auctionId: string, bidderId: string, bidderName: string, amount: number): Promise<{ ok: boolean; error?: string; auction?: DBAuction }> {
  try {
    const auction = await getAuctionById(auctionId)
    if (!auction) return { ok: false, error: 'Auction not found' }
    if (auction.status !== 'live') return { ok: false, error: 'Auction is not live' }
    if (new Date(auction.ends_at).getTime() < Date.now()) return { ok: false, error: 'Auction has ended' }
    const minRequired = auction.current_bid + auction.min_increment
    if (amount < minRequired) return { ok: false, error: `Bid must be at least ${minRequired}π` }

    // محاولة تحديث السعر بشرط أن لا يتغيّر منذ القراءة (يمنع تجاوز مزايدتين متزامنتين لبعضهما)
    const { data: updated, error: updateErr } = await supabase
      .from('auctions').update({ current_bid: amount }).eq('id', auctionId).eq('current_bid', auction.current_bid).select().single()
    if (updateErr || !updated) return { ok: false, error: 'Someone else just placed a higher bid — refresh and try again' }

    await supabase.from('auction_bids').insert({ auction_id: auctionId, bidder_id: bidderId, bidder_name: bidderName, amount })
    return { ok: true, auction: updated as DBAuction }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Bid failed' }
  }
}

export async function getAuctionBids(auctionId: string): Promise<DBAuctionBid[]> {
  try {
    const { data } = await supabase.from('auction_bids').select('*').eq('auction_id', auctionId).order('created_at', { ascending: false }).limit(50)
    return (data ?? []) as DBAuctionBid[]
  } catch { return [] }
}

// اشترك في تحديثات لحظية حقيقية لمزاد معيّن (Supabase Realtime) — بدون أي polling
export function subscribeToAuction(auctionId: string, onUpdate: (auction: DBAuction) => void) {
  const channel = supabase
    .channel(`auction-${auctionId}`)
    .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
      (payload: any) => onUpdate(payload.new as DBAuction))
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export async function endAuction(auctionId: string): Promise<boolean> {
  try {
    const bids = await getAuctionBids(auctionId)
    const winner = bids[0]?.bidder_id
    const { error } = await supabase.from('auctions').update({ status: 'ended', winner_user_id: winner || null }).eq('id', auctionId)
    return !error
  } catch { return false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP DEALS — تسوق جماعي حقيقي: خصم يُفعَّل فعلياً عند بلوغ عدد المنضمين
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBGroupDeal {
  id?:             string
  seller_user_id:  string
  product_name:    string
  image?:          string
  original_price:  number
  group_price:     number
  members_needed:  number
  members_joined:  number
  status:          'open' | 'full' | 'expired'
  ends_at:         string
  created_at?:     string
}

export async function createGroupDeal(g: Omit<DBGroupDeal, 'id' | 'members_joined' | 'status' | 'created_at'>): Promise<DBGroupDeal | null> {
  try {
    const row = { ...g, members_joined: 1, status: 'open' as const }
    const { data, error } = await supabase.from('group_deals').insert(row).select().single()
    if (error) return null
    const deal = data as DBGroupDeal
    // نشر تلقائي على الاجتماعي: صفقة جماعية جديدة
    const seller = await getUserById(deal.seller_user_id)
    crossPostToSocial(deal.seller_user_id, seller?.store_name || seller?.username || 'Store',
      `👥 Group deal: "${deal.product_name}" at ${deal.group_price}π when ${deal.members_needed} join — join on Space`)
    return deal
  } catch { return null }
}

export async function getOpenGroupDeals(): Promise<DBGroupDeal[]> {
  try {
    const { data } = await supabase.from('group_deals').select('*').eq('status', 'open').order('ends_at', { ascending: true })
    return (data ?? []) as DBGroupDeal[]
  } catch { return [] }
}

export async function joinGroupDeal(dealId: string, userId: string): Promise<{ ok: boolean; deal?: DBGroupDeal; error?: string }> {
  try {
    // تحقق أن المستخدم لم ينضم مسبقاً
    const { data: existing } = await supabase.from('group_deal_members').select('id').eq('deal_id', dealId).eq('user_id', userId).maybeSingle()
    if (existing) return { ok: false, error: 'You already joined this deal' }

    const { data: deal } = await supabase.from('group_deals').select('*').eq('id', dealId).single()
    if (!deal) return { ok: false, error: 'Deal not found' }
    if (deal.status !== 'open') return { ok: false, error: 'This deal is no longer open' }

    await supabase.from('group_deal_members').insert({ deal_id: dealId, user_id: userId })
    const newCount = deal.members_joined + 1
    const newStatus = newCount >= deal.members_needed ? 'full' : 'open'
    const { data: updated, error } = await supabase.from('group_deals').update({ members_joined: newCount, status: newStatus }).eq('id', dealId).select().single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, deal: updated as DBGroupDeal }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to join' }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS — اشتراكات Pro/Enterprise حقيقية ودائمة (Supabase، وليس ذاكرة)
// القراءة والكتابة تتمّان حصراً من جهة الخادم بعميل Service Role في
// lib/dabia/db/admin.ts، بعد التحقق الحقيقي من دفعة Pi في مسار
// app/api/dabia/subscriptions/route.ts. لا يُسمح للعميل العلني (anon) بالكتابة
// المباشرة، لذا لا توجد هنا دوال تعمل بعميل anon. هذا التعريف للنوع فقط.
// ═══════════════════════════════════════════════════════════════════════════════
export interface DBSubscription {
  id?:          string
  user_id:      string
  tier:         'pro' | 'enterprise'
  activated_at: string
  expires_at:   string
  paid_in_pi:   number
  pi_tx_id:     string
  created_at?:  string
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL PLATFORM STATS — إحصائيات حقيقية مبنية على Supabase فعلياً
// تستبدل الـ "Transparency dashboard" الوهمي السابق الذي كان يعرض بيانات
// ثابتة في الذاكرة بصفة "on-chain confirmed" كاذبة. كل رقم هنا حقيقي ومُحسَّب
// من الجداول الفعلية، لا يوجد أي "blockHeight" أو رقم بلوكشين مزيّف.
// ═══════════════════════════════════════════════════════════════════════════════
export interface RealPlatformStats {
  totalUsers:        number
  totalProducts:     number
  totalOrders:       number
  totalVolumePi:     number
  activeMerchants:   number
}

export async function getRealPlatformStats(): Promise<RealPlatformStats> {
  try {
    const [{ count: totalUsers }, { count: totalProducts }, { data: orders }, { count: activeMerchants }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total_price'),
      supabase.from('users').select('id', { count: 'exact', head: true }).neq('role', 'buyer').eq('status', 'active'),
    ])
    const totalVolumePi = (orders ?? []).reduce((sum, o: any) => sum + (Number(o.total_price) || 0), 0)
    return {
      totalUsers: totalUsers ?? 0,
      totalProducts: totalProducts ?? 0,
      totalOrders: (orders ?? []).length,
      totalVolumePi,
      activeMerchants: activeMerchants ?? 0,
    }
  } catch {
    return { totalUsers: 0, totalProducts: 0, totalOrders: 0, totalVolumePi: 0, activeMerchants: 0 }
  }
}
