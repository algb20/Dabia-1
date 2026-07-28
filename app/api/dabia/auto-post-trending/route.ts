import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/dabia/auto-post-trending
// Publishes top trending products to the social feed if they have no recent post.
// Accepts EITHER a valid Supabase user JWT (browser client) OR CRON_SECRET header
// (scheduled cron jobs). Rejects callers that provide neither when CRON_SECRET is set.
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader
    const isCron = token === cronSecret
    if (!isCron) {
      // Also accept a valid Supabase user session from the browser
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
      if (token && supabaseUrl && anonKey) {
        const check = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
        const { error } = await check.auth.getUser(token)
        if (error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }
  }
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  try {
    const { data: trending } = await supa
      .from('products')
      .select('id, name, price, image, seller_user_id, trend_score')
      .eq('active', true)
      .gt('trend_score', 5)
      .order('trend_score', { ascending: false })
      .limit(15)

    if (!trending?.length) return NextResponse.json({ created: 0 })

    // Avoid re-posting the same product within 24 hours
    const since = new Date(Date.now() - 86_400_000).toISOString()
    const { data: recent } = await supa
      .from('posts')
      .select('product_id')
      .eq('type', 'product_share')
      .gte('created_at', since)

    const alreadyPosted = new Set((recent ?? []).map((r: any) => String(r.product_id)))
    const fresh = trending.filter(t => !alreadyPosted.has(String(t.id)) && t.seller_user_id)

    if (!fresh.length) return NextResponse.json({ created: 0 })

    const sellerIds = [...new Set(fresh.map(p => p.seller_user_id).filter(Boolean))]
    const { data: sellers } = await supa.from('users').select('id, username').in('id', sellerIds)
    const sellerMap = new Map((sellers ?? []).map((s: any) => [String(s.id), s.username as string]))

    const rows = fresh.slice(0, 6).map(p => ({
      user_id: p.seller_user_id,
      username: sellerMap.get(String(p.seller_user_id)) ?? 'seller',
      type: 'product_share',
      product_id: String(p.id),
      product_snapshot: { name: p.name, price: p.price, image: p.image },
      text: `🔥 Trending on Dabia — ${p.name}`,
      is_official: false,
    }))

    const { data: inserted } = await supa.from('posts').insert(rows).select('id')
    return NextResponse.json({ created: inserted?.length ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
