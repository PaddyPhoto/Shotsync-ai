import { NextResponse } from 'next/server'
import type { PlanId } from '@/lib/plans'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function GET() {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ data: null }) // client falls back to localStorage
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null })

    // Read plan from the org the user belongs to (org-level billing)
    const { data: membership } = await supabase
      .from('org_members')
      .select('orgs(id, plan, exports_this_month)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const org = membership?.orgs as unknown as {
      id: string
      plan: string
      exports_this_month: number
    } | null

    if (!org) return NextResponse.json({ data: null })

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
