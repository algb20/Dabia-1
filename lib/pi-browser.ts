// ═══════════════════════════════════════════════════════════════════════════
// فتح الروابط داخل متصفّح Pi Network فعلياً (لا في كروم).
//
// المشكلة: عندما يشارك مستخدمٌ رابط منتج/حساب ويفتحه المستلِم على هاتفه، يفتحه
// النظام في المتصفّح الافتراضي (كروم) بدل Pi Browser — فتضيع مدفوعات Pi والهوية.
//
// الحل التقني الحقيقي على أندرويد (حيث غالبية مستخدمي Pi): رابط Android "intent"
// يوجّه النظام لفتح الـ URL داخل تطبيق محدَّد بحزمته (package=pi.browser) وهو
// متصفّح Pi. إن كان مثبّتاً فُتِح فيه مباشرةً، وإلا تحوّل إلى متجر Play لتثبيته.
// على iOS لا يوجد مكافئ للـ intent، فنعتمد نسخ الرابط مع إرشاد واضح.
// ═══════════════════════════════════════════════════════════════════════════

// حزمة تطبيق Pi Browser على Google Play (play.google.com/store/apps/details?id=pi.browser)
const PI_BROWSER_PACKAGE = "pi.browser"
const PI_BROWSER_PLAY_URL = "https://play.google.com/store/apps/details?id=pi.browser"

// هل نحن داخل Pi Browser أصلاً؟ نتحقّق من حقن SDK ومن سلسلة الوكيل.
export function isInsidePiBrowser(): boolean {
  if (typeof window === "undefined") return false
  if ((window as any).Pi) return true
  const ua = navigator.userAgent || ""
  return /PiBrowser/i.test(ua)
}

function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "")
}

// يبني رابط Android intent الذي يفرض الفتح داخل Pi Browser تحديداً.
export function buildPiBrowserIntentUrl(httpsUrl: string): string {
  try {
    const u = new URL(httpsUrl)
    const hostAndPath = `${u.host}${u.pathname}${u.search}${u.hash}`
    const fallback = encodeURIComponent(PI_BROWSER_PLAY_URL)
    return `intent://${hostAndPath}#Intent;scheme=https;package=${PI_BROWSER_PACKAGE};S.browser_fallback_url=${fallback};end`
  } catch {
    return httpsUrl
  }
}

// يحاول فتح الرابط داخل Pi Browser. يُعيد "opened" على أندرويد (تولّى النظام
// التحويل)، و"copied" على غير أندرويد بعد نسخ الرابط، أو "manual" إن تعذّر النسخ.
export async function openInPiBrowser(httpsUrl: string): Promise<"opened" | "copied" | "manual"> {
  if (isAndroid()) {
    window.location.href = buildPiBrowserIntentUrl(httpsUrl)
    return "opened"
  }
  // iOS وغيره: انسخ الرابط ليَلصقه المستخدم داخل Pi Browser
  try {
    await navigator.clipboard?.writeText(httpsUrl)
    return "copied"
  } catch {
    return "manual"
  }
}
