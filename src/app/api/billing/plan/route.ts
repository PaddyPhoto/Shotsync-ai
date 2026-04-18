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

  const debug: Record<string, unknown> = {}

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    // Try bearer token first, fall back to request cookies
    let user: { id: string } | null = null
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    debug.hasToken = !!token
    if (token) {
      const { data } = await service.auth.getUser(token)
      user = data.user
      debug.userFromToken = user?.id ?? null
    }
    if (!user) {
      const cookieClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
      )
      const { data } = await cookieClient.auth.getUser()
      user = data.user
      debug.userFromCookie = user?.id ?? null
    }
    if (!user) {
      debug.result = 'no-user'
      console.error('[plan-debug]', JSON.stringify(debug))
      return NextResponse.json({ data: null })
    }

    debug.resolvedUserId = user.id

    // Use a SQL function to bypass PostgREST schema cache entirely
    const { data: rows, error: rpcError } = await service
      .rpc('get_org_for_user', { p_user_id: user.id })

    debug.rpcRows = rows
    debug.rpcError = rpcError?.message ?? null

    if (rpcError) {
      console.error('[plan-debug]', JSON.stringify(debug))
      return NextResponse.json({ data: null })
    }

    const row = rows?.[0]
    if (!row) {
      debug.result = 'no-row'
      console.error('[plan-debug]', JSON.stringify(debug))
      return NextResponse.json({ data: null })
    }

    debug.orgId = row.org_id
    debug.rawPlan = row.plan
    debug.result = 'ok'
    console.error('[plan-debug]', JSON.stringify(debug))

    return NextResponse.json({
      data: {
        plan: (row.plan ?? 'free') as PlanId,
        usage: {
          exportsThisMonth: row.exports_this_month ?? 0,
          totalBrandsCreated: 0,
        },
      },
      _debug: debug,
    })
  } catch (err) {
    debug.result = 'exception'
    debug.error = err instanceof Error ? err.message : String(err)
    console.error('[plan-debug]', JSON.stringify(debug))
    return NextResponse.json({ data: null })
  }
}
