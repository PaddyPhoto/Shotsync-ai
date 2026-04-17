import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { PlanId } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function GET(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: null }) // client falls back to localStorage
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    // Try bearer token first, fall back to request cookies
    let user: { id: string } | null = null
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      const { data } = await service.auth.getUser(token)
      user = data.user
    }
    if (!user) {
      const cookieClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
      )
      const { data } = await cookieClient.auth.getUser()
      user = data.user
    }
    if (!user) return NextResponse.json({ data: null })

    const supabase = service

    // Two-step lookup to avoid PostgREST schema cache issues with ALTER TABLE columns
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership?.org_id) return NextResponse.json({ data: null })

    const { data: org } = await supabase
      .from('orgs')
      .select('id, plan, exports_this_month')
      .eq('id', membership.org_id)
      .single()

    if (!org) return NextResponse.json({ data: null })

    // Temporary debug — remove after diagnosis
    console.log('[plan] raw org row:', JSON.stringify(org))

    return NextResponse.json({
      data: {
        plan: (org.plan ?? 'free') as PlanId,
        usage: {
          exportsThisMonth: org.exports_this_month ?? 0,
          totalBrandsCreated: 0,
        },
      },
    })
  } catch (err) {
    console.error('GET /api/billing/plan error:', err)
    return NextResponse.json({ data: null })
  }
}
