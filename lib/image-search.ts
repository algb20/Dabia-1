// ═══════════════════════════════════════════════════════════════════════════
// بحث بالصور حقيقي داخل المتصفح — بدون أي خدمة خارجية أو مفاتيح.
//
// الطريقة: بصمة إدراكية (average hash): تُصغَّر الصورة إلى 8×8 بتدرّج رمادي،
// ويُشتق منها 64-بت حسب كون كل بكسل أعلى/أدنى من المتوسط. صورتان متشابهتان
// تنتجان بصمتين متقاربتين (مسافة هامينغ صغيرة). يعمل بالكامل على جهاز
// المستخدم — يدعم Pi Browser لأنه Canvas قياسي فقط.
// ═══════════════════════════════════════════════════════════════════════════

const HASH_SIZE = 8 // 8×8 = بصمة 64 بت

function imageToHash(img: HTMLImageElement): bigint | null {
  const canvas = document.createElement("canvas")
  canvas.width = HASH_SIZE
  canvas.height = HASH_SIZE
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data
  } catch {
    // صورة من نطاق يمنع CORS — لا يمكن قراءة بكسلاتها
    return null
  }
  const gray: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }
  const avg = gray.reduce((s, v) => s + v, 0) / gray.length
  let hash = 0n
  for (let i = 0; i < gray.length; i++) {
    hash = (hash << 1n) | (gray[i] >= avg ? 1n : 0n)
  }
  return hash
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = "anonymous" // تخزين Supabase العام يسمح بـ CORS
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function hashImageFile(file: File): Promise<bigint | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    return img ? imageToHash(img) : null
  } finally {
    URL.revokeObjectURL(url)
  }
}

// كاش داخل الجلسة لبصمات صور المنتجات — يمنع إعادة تنزيلها في كل بحث
const productHashCache = new Map<string, bigint | null>()

export async function hashImageUrl(url: string): Promise<bigint | null> {
  if (productHashCache.has(url)) return productHashCache.get(url)!
  const img = await loadImage(url)
  const hash = img ? imageToHash(img) : null
  productHashCache.set(url, hash)
  return hash
}

export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b
  let count = 0
  while (x) { count += Number(x & 1n); x >>= 1n }
  return count
}

// يرتّب المرشحين حسب تشابههم البصري مع صورة الاستعلام (الأقرب أولاً).
// distance <= 14 من 64 يُعد تشابهاً قوياً؛ نُرجع حتى 22 كنتائج محتملة.
export async function rankByImageSimilarity<T extends { id: string | number; image?: string }>(
  queryFile: File,
  candidates: T[],
): Promise<Array<T & { distance: number }>> {
  const queryHash = await hashImageFile(queryFile)
  if (queryHash === null) return []
  const results: Array<T & { distance: number }> = []
  // بصمات المرشحين تُحسب بالتوازي (الكاش يجعل التكرار مجانياً)
  await Promise.all(candidates.map(async c => {
    if (!c.image) return
    const h = await hashImageUrl(c.image)
    if (h === null) return
    const distance = hammingDistance(queryHash, h)
    if (distance <= 22) results.push({ ...c, distance })
  }))
  return results.sort((a, b) => a.distance - b.distance)
}
