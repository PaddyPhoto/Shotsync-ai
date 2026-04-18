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

    // Use a SQL function to bypass PostgREST schema cache entirely
    const { data: rows, error: rpcError } = await supabase
      .rpc('get_org_for_user', { p_user_id: user.id })

    if (rpcError) {
      console.error('get_org_for_user rpc error:', rpcError)
      return NextResponse.json({ data: null })
    }

    const row = rows?.[0]
    if (!row) return NextResponse.json({ data: null })

    console.error('[plan] userId:', user.id, 'orgId:', row.org_id, 'plan:', row.plan)

    return NextResponse.json({
      data: {
        plan: (row.plan ?? 'free') as PlanId,
        usage: {
          exportsThisMonth: row.exports_this_month ?? 0,
          totalBrandsCreated: 0,
        },
      },
    })
  } catch (err) {
    console.error('GET /api/billing/plan error:', err)
    return NextResponse.json({ data: null })
  }
}
