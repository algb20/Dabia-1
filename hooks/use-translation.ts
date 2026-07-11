'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

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

// ── ترجمة نص واحد عبر Google Translate (مجاني، بدون مفتاح) ───────────────────
async function translateBatch(texts: string[], target: string): Promise<string[]> {
  if (target === 'en' || texts.length === 0) return texts
  try {
    // Google يقبل دفعة نصوص مفصولة بسطر جديد في طلب واحد لتقليل عدد الطلبات
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
    // fallback لأي سطر لم يُحلل
    return result.map((r, i) => r || texts[i])
  } catch {
    return texts
  }
}

// ── يمسح كل عناصر النص الحقيقية في الصفحة ويترجمها، يحفظ النص الأصلي لإرجاعه ─
const ORIGINAL_ATTR = 'data-dabia-original'
const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','svg','SVG','path','PATH','INPUT','TEXTAREA'])

function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = []
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent?.trim()
      if (txt && txt.length > 0 && /[a-zA-Z]/.test(txt)) nodes.push(node as Text)
      return
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName
      if (SKIP_TAGS.has(tag)) return
      node.childNodes.forEach(walk)
    }
  }
  walk(root)
  return nodes
}

export function useTranslation() {
  const [lang, setLangState] = useState<Lang>('en')
  const [translating, setTranslating] = useState(false)
  const originalsRef = useRef<Map<Text, string>>(new Map())

  const applyTranslation = useCallback(async (target: string) => {
    setTranslating(true)
    try {
      const root = document.getElementById('dabia-app-root') || document.body
      const nodes = collectTextNodes(root)

      // استعد النصوص الأصلية المحفوظة أولاً (إن وُجدت) قبل الترجمة الجديدة
      nodes.forEach(n => {
        if (!originalsRef.current.has(n)) {
          originalsRef.current.set(n, n.textContent || '')
        }
      })

      if (target === 'en') {
        nodes.forEach(n => {
          const orig = originalsRef.current.get(n)
          if (orig !== undefined) n.textContent = orig
        })
        document.documentElement.dir = 'ltr'
        document.documentElement.lang = 'en'
        setTranslating(false)
        return
      }

      // تحقق من الكاش المحفوظ محلياً لهذه اللغة
      const cacheKey = `${CACHE_PREFIX}${target}`
      let cache: Record<string,string> = {}
      try { cache = JSON.parse(localStorage.getItem(cacheKey) || '{}') } catch {}

      const originals = nodes.map(n => originalsRef.current.get(n) || '')
      const toTranslate: string[] = []
      const toTranslateIdx: number[] = []
      originals.forEach((txt, i) => {
        if (!cache[txt]) { toTranslate.push(txt); toTranslateIdx.push(i) }
      })

      // ترجم على دفعات من 40 نص لكل طلب لتقليل عدد الـ HTTP calls
      const BATCH = 40
      for (let i = 0; i < toTranslate.length; i += BATCH) {
        const batchTexts = toTranslate.slice(i, i + BATCH)
        const batchIdx   = toTranslateIdx.slice(i, i + BATCH)
        const translated = await translateBatch(batchTexts, target)
        batchTexts.forEach((orig, j) => { cache[orig] = translated[j] })
        // طبّق فوراً كل دفعة بدل الانتظار لكل الدفعات
        batchIdx.forEach((idx) => {
          const node = nodes[idx]
          const orig = originals[idx]
          if (node && cache[orig]) node.textContent = cache[orig]
        })
      }

      // طبّق كل النصوص (من الكاش الموجود مسبقاً + المترجم حديثاً)
      nodes.forEach((n, i) => {
        const orig = originals[i]
        if (cache[orig]) n.textContent = cache[orig]
      })

      try { localStorage.setItem(cacheKey, JSON.stringify(cache)) } catch {}

      document.documentElement.dir  = RTL_CODES.includes(target) ? 'rtl' : 'ltr'
      document.documentElement.lang = target
    } catch {}
    setTranslating(false)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      // المستخدم اختار لغة سابقاً بنفسه — نحترم اختياره ولا نتجاوزه أبداً
      setLangState(saved)
      if (saved !== 'en') setTimeout(() => applyTranslation(saved), 600)
      return
    }
    // أول زيارة فقط — نكتشف لغة الجهاز/المتصفح تلقائياً ونطابقها مع لغات ندعمها
    const browserLangs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) as string[]
    const supportedCodes = new Set(LANGUAGES.map(l => l.code))
    let detected = 'en'
    for (const bl of browserLangs) {
      const short = bl.toLowerCase().split('-')[0]
      if (supportedCodes.has(short)) { detected = short; break }
    }
    setLangState(detected)
    localStorage.setItem(KEY, detected) // نحفظها فوراً حتى لا نُعيد الاكتشاف كل مرة
    if (detected !== 'en') setTimeout(() => applyTranslation(detected), 600)
  }, [applyTranslation])

  const setLang = useCallback(async (newLang: string) => {
    setLangState(newLang)
    localStorage.setItem(KEY, newLang)
    await applyTranslation(newLang)
  }, [applyTranslation])

  // دالة ثابتة (لا تترجم تلقائياً) — متبقاة للتوافق مع كود قديم يستخدم t()
  const t = useCallback((key: string): string => key, [])

  return { lang, setLang, t, translating }
}
