'use client'
import { useState, useEffect, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// محرّك ترجمة عالمي واحد لكل التطبيق — Google Translate مباشرة، بدون مفتاح.
//
// الإصلاح الجذري: النسخة السابقة كانت تترجم مرة واحدة عند فتح كل صفحة، فأي
// محتوى يظهر لاحقاً (تبديل تبويب، قائمة تُحمَّل من Supabase، إعادة رسم React)
// كان يرجع إنجليزياً، وكل صفحة كانت "تطلب ترجمتها" وحدها. الآن يوجد محرّك
// واحد على مستوى التطبيق كله (singleton خارج React) يعمل باستمرار عبر
// MutationObserver: أي نص جديد يُضاف إلى الصفحة يُترجم تلقائياً فور ظهوره،
// في كل الصفحات، دون أي طلب يدوي. اللغة المختارة محفوظة وتُطبَّق في كل مكان.
// ═══════════════════════════════════════════════════════════════════════════

export type Lang = string
const KEY = 'dabia_lang'
const CACHE_PREFIX = 'dabia_dom_trans_'

export const LANGUAGES = [
  {code:'en',name:'English',flag:'🇬🇧'},
  {code:'ar',name:'العربية',flag:'🇸🇦',rtl:true},
  {code:'zh',name:'中文',flag:'🇨🇳'},
  {code:'es',name:'Español',flag:'🇪🇸'},
  {code:'fr',name:'Français',flag:'🇫🇷'},
  {code:'pt',name:'Português',flag:'🇧🇷'},
  {code:'de',name:'Deutsch',flag:'🇩🇪'},
  {code:'ja',name:'日本語',flag:'🇯🇵'},
  {code:'ko',name:'한국어',flag:'🇰🇷'},
  {code:'ru',name:'Русский',flag:'🇷🇺'},
  {code:'hi',name:'हिंदी',flag:'🇮🇳'},
  {code:'tr',name:'Türkçe',flag:'🇹🇷'},
  {code:'id',name:'Indonesia',flag:'🇮🇩'},
  {code:'vi',name:'Tiếng Việt',flag:'🇻🇳'},
  {code:'th',name:'ภาษาไทย',flag:'🇹🇭'},
  {code:'fa',name:'فارسی',flag:'🇮🇷',rtl:true},
  {code:'ur',name:'اردو',flag:'🇵🇰',rtl:true},
  {code:'sw',name:'Kiswahili',flag:'🇰🇪'},
  {code:'nl',name:'Nederlands',flag:'🇳🇱'},
  {code:'pl',name:'Polski',flag:'🇵🇱'},
  {code:'it',name:'Italiano',flag:'🇮🇹'},
  {code:'sv',name:'Svenska',flag:'🇸🇪'},
  {code:'uk',name:'Українська',flag:'🇺🇦'},
  {code:'ro',name:'Română',flag:'🇷🇴'},
  {code:'el',name:'Ελληνικά',flag:'🇬🇷'},
  {code:'he',name:'עברית',flag:'🇮🇱',rtl:true},
  {code:'tl',name:'Filipino',flag:'🇵🇭'},
  {code:'ms',name:'Melayu',flag:'🇲🇾'},
  {code:'bn',name:'বাংলা',flag:'🇧🇩'},
  {code:'ta',name:'தமிழ்',flag:'🇮🇳'},
  {code:'ha',name:'Hausa',flag:'🇳🇬'},
  {code:'am',name:'አማርኛ',flag:'🇪🇹'},
  {code:'zu',name:'isiZulu',flag:'🇿🇦'},
  {code:'cs',name:'Čeština',flag:'🇨🇿'},
  {code:'hu',name:'Magyar',flag:'🇭🇺'},
  {code:'fi',name:'Suomi',flag:'🇫🇮'},
  {code:'no',name:'Norsk',flag:'🇳🇴'},
  {code:'da',name:'Dansk',flag:'🇩🇰'},
  {code:'sk',name:'Slovenčina',flag:'🇸🇰'},
  {code:'hr',name:'Hrvatski',flag:'🇭🇷'},
  {code:'bg',name:'Български',flag:'🇧🇬'},
  {code:'ka',name:'ქართული',flag:'🇬🇪'},
  {code:'az',name:'Azərbaycan',flag:'🇦🇿'},
  {code:'kk',name:'Қазақ',flag:'🇰🇿'},
  {code:'uz',name:"O'zbek",flag:'🇺🇿'},
  {code:'mn',name:'Монгол',flag:'🇲🇳'},
  {code:'my',name:'မြန်မာ',flag:'🇲🇲'},
  {code:'km',name:'ភាសាខ្មែរ',flag:'🇰🇭'},
  {code:'ne',name:'नेपाली',flag:'🇳🇵'},
  {code:'af',name:'Afrikaans',flag:'🇿🇦'},
]

const RTL_CODES = ['ar','he','fa','ur']
const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','svg','SVG','path','PATH','INPUT','TEXTAREA'])

// ── ترجمة دفعة نصوص عبر Google Translate (مجاني، بدون مفتاح) ────────────────
async function translateBatch(texts: string[], target: string): Promise<string[]> {
  if (target === 'en' || texts.length === 0) return texts
  try {
    const joined = texts.map((t, i) => `§${i}§${t}`).join('\n')
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(joined)}`
    )
    const data = await res.json()
    const translatedJoined: string = data[0]?.map((x: any[]) => x[0]).join('') || joined
    const lines = translatedJoined.split('\n')
    const result: string[] = new Array(texts.length).fill('')
    for (const line of lines) {
      const m = line.match(/§(\d+)§(.*)/s)
      if (m) result[parseInt(m[1])] = m[2]
    }
    return result.map((r, i) => r || texts[i])
  } catch {
    return texts
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// المحرّك — حالة واحدة على مستوى الوحدة (singleton)، خارج دورة حياة React
// ═══════════════════════════════════════════════════════════════════════════
type Listener = () => void

const engine = {
  lang: 'en' as string,
  translating: false,
  started: false,
  // النص الإنجليزي الأصلي لكل عقدة نصية — للرجوع إلى English وللترجمة الصحيحة
  originals: new Map<Text, string>(),
  cache: {} as Record<string, string>,
  observer: null as MutationObserver | null,
  // كتاباتنا نحن على DOM يجب ألا تعود إلينا كتغييرات تحتاج ترجمة (منع حلقة لانهائية)
  suppress: false,
  pending: new Set<Text>(),
  flushTimer: null as ReturnType<typeof setTimeout> | null,
  listeners: new Set<Listener>(),

  notify() { this.listeners.forEach(l => l()) },

  setTranslating(v: boolean) {
    if (this.translating !== v) { this.translating = v; this.notify() }
  },

  loadCache(lang: string) {
    try { this.cache = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${lang}`) || '{}') }
    catch { this.cache = {} }
  },
  saveCache(lang: string) {
    try { localStorage.setItem(`${CACHE_PREFIX}${lang}`, JSON.stringify(this.cache)) } catch {}
  },

  // يجمع كل العقد النصية القابلة للترجمة تحت جذر معيّن
  collect(root: Node): Text[] {
    const nodes: Text[] = []
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent?.trim()
        if (txt && /[a-zA-Z]/.test(txt)) nodes.push(node as Text)
        return
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (SKIP_TAGS.has((node as Element).tagName)) return
        node.childNodes.forEach(walk)
      }
    }
    walk(root)
    return nodes
  },

  // يكتب نصوصاً على DOM دون أن يلتقطها المراقب كمحتوى جديد
  write(pairs: Array<[Text, string]>) {
    this.suppress = true
    for (const [node, text] of pairs) {
      if (node.isConnected) node.textContent = text
    }
    // تفريغ سجلّات المراقب الناتجة عن كتاباتنا قبل رفع الكبح
    this.observer?.takeRecords()
    this.suppress = false
  },

  // يترجم مجموعة عقد (كاش أولاً، ثم الشبكة على دفعات) ويطبّقها فوراً
  async translateNodes(nodes: Text[]) {
    const lang = this.lang
    if (lang === 'en' || nodes.length === 0) return

    // سجّل الأصل الإنجليزي لكل عقدة جديدة (أو عقدة أعاد React كتابتها بنص جديد)
    for (const n of nodes) {
      const current = n.textContent || ''
      const known = this.originals.get(n)
      // إن كان النص الحالي هو ترجمة سبق أن كتبناها، لا تعدّه أصلاً جديداً
      if (known === undefined) {
        // نص يطابق قيمة مترجمة معروفة في الكاش لا يُعاد اعتباره أصلاً
        this.originals.set(n, current)
      } else if (current !== known && this.cache[known] !== current) {
        // React أعاد كتابة العقدة بنص إنجليزي مختلف — حدّث الأصل
        this.originals.set(n, current)
      }
    }

    const todo: Text[] = []
    const applyNow: Array<[Text, string]> = []
    for (const n of nodes) {
      const orig = this.originals.get(n) || ''
      if (!orig.trim()) continue
      const cached = this.cache[orig]
      if (cached) {
        if (n.textContent !== cached) applyNow.push([n, cached])
      } else {
        todo.push(n)
      }
    }
    if (applyNow.length) this.write(applyNow)
    if (todo.length === 0) return

    this.setTranslating(true)
    try {
      const BATCH = 40
      for (let i = 0; i < todo.length; i += BATCH) {
        const slice = todo.slice(i, i + BATCH)
        if (this.lang !== lang) return // بدّل المستخدم اللغة أثناء العمل — أوقف هذه الجولة
        const originals = slice.map(n => this.originals.get(n) || '')
        const translated = await translateBatch(originals, lang)
        const pairs: Array<[Text, string]> = []
        slice.forEach((n, j) => {
          this.cache[originals[j]] = translated[j]
          pairs.push([n, translated[j]])
        })
        this.write(pairs)
      }
      this.saveCache(lang)
    } finally {
      this.setTranslating(false)
    }
  },

  scheduleFlush() {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      const nodes = Array.from(this.pending)
      this.pending.clear()
      this.translateNodes(nodes.filter(n => n.isConnected))
    }, 250)
  },

  onMutations(records: MutationRecord[]) {
    if (this.suppress || this.lang === 'en') return
    for (const r of records) {
      if (r.type === 'characterData') {
        const t = r.target as Text
        const txt = t.textContent?.trim()
        if (txt && /[a-zA-Z]/.test(txt)) {
          // تجاهل النص إن كان هو نفسه ترجمة سبق تطبيقها (قيمة موجودة في الكاش)
          const known = this.originals.get(t)
          if (!(known !== undefined && this.cache[known] === t.textContent)) this.pending.add(t)
        }
      } else if (r.type === 'childList') {
        r.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.textContent?.trim()
            if (txt && /[a-zA-Z]/.test(txt)) this.pending.add(node as Text)
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            this.collect(node).forEach(n => this.pending.add(n))
          }
        })
      }
    }
    if (this.pending.size) this.scheduleFlush()
  },

  applyDirection(lang: string) {
    document.documentElement.dir  = RTL_CODES.includes(lang) ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  },

  // إرجاع كل النصوص إلى الإنجليزية الأصلية
  restoreEnglish() {
    const pairs: Array<[Text, string]> = []
    this.originals.forEach((orig, node) => {
      if (node.isConnected) pairs.push([node, orig])
    })
    this.write(pairs)
    this.originals.clear()
    this.applyDirection('en')
  },

  async setLang(newLang: string) {
    if (newLang === this.lang) return
    try { localStorage.setItem(KEY, newLang) } catch {}
    const prev = this.lang
    this.lang = newLang
    this.notify()

    if (newLang === 'en') {
      this.restoreEnglish()
      return
    }
    // عند التبديل بين لغتين غير إنجليزيتين، أرجع الأصل أولاً حتى تكون
    // "الأصول" صحيحة ثم ترجم للغة الجديدة
    if (prev !== 'en') {
      const pairs: Array<[Text, string]> = []
      this.originals.forEach((orig, node) => { if (node.isConnected) pairs.push([node, orig]) })
      this.write(pairs)
    }
    this.loadCache(newLang)
    this.applyDirection(newLang)
    await this.translateNodes(this.collect(document.body))
  },

  // يبدأ المحرّك مرة واحدة لكل التطبيق (يُستدعى من TranslationProvider في layout)
  start() {
    if (this.started || typeof window === 'undefined') return
    this.started = true

    let saved = ''
    try { saved = localStorage.getItem(KEY) || '' } catch {}
    if (!saved) {
      // أول زيارة — اكتشف لغة الجهاز وطابقها مع اللغات المدعومة
      const browserLangs = (navigator.languages?.length ? navigator.languages : [navigator.language]) as string[]
      const supported = new Set(LANGUAGES.map(l => l.code))
      saved = 'en'
      for (const bl of browserLangs) {
        const short = bl.toLowerCase().split('-')[0]
        if (supported.has(short)) { saved = short; break }
      }
      try { localStorage.setItem(KEY, saved) } catch {}
    }
    this.lang = saved
    this.notify()

    this.observer = new MutationObserver(rs => this.onMutations(rs))
    this.observer.observe(document.body, { childList: true, characterData: true, subtree: true })

    if (saved !== 'en') {
      this.loadCache(saved)
      this.applyDirection(saved)
      // مهلة قصيرة حتى يكتمل أول رسم للصفحة ثم ترجمة شاملة
      setTimeout(() => this.translateNodes(this.collect(document.body)), 400)
    }
  },
}

// يُستدعى من TranslationProvider (مثبَّت في layout.tsx فوق كل الصفحات)
export function startTranslationEngine() { engine.start() }

// ═══════════════════════════════════════════════════════════════════════════
// الـ hook — واجهة React رقيقة فوق المحرّك (نفس الواجهة السابقة تماماً)
// ═══════════════════════════════════════════════════════════════════════════
export function useTranslation() {
  const [, force] = useState(0)

  useEffect(() => {
    engine.start() // ضمانة إضافية إن استُخدم الـ hook قبل تركيب المزوّد
    const l = () => force(x => x + 1)
    engine.listeners.add(l)
    return () => { engine.listeners.delete(l) }
  }, [])

  const setLang = useCallback((newLang: string) => engine.setLang(newLang), [])
  // دالة ثابتة — متبقاة للتوافق مع كود قديم يستخدم t()
  const t = useCallback((key: string): string => key, [])

  return { lang: engine.lang, setLang, t, translating: engine.translating }
}
