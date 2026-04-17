import { NextRequest, NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/lib/plans'

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const body = await req.json() as { planId: PlanId }
  const { planId } = body

  if (!planId || planId === 'free') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const plan = PLANS[planId]
  if (!plan.stripePriceId && STRIPE_CONFIGURED) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 400 })
  }

  // Demo mode: just return success
  if (!STRIPE_CONFIGURED) {
    return NextResponse.json({ url: `${APP_URL}/dashboard/settings?tab=billing&upgraded=${planId}` })
  }

  try {
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const service = createServiceClient()

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

    // Look up the org this user belongs to
    const { data: membership } = await service
      .from('org_members')
      .select('org_id, orgs(id, stripe_customer_id, name)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const org = membership?.orgs as unknown as { id: string; stripe_customer_id: string | null; name: string } | null
    const orgId = membership?.org_id
    if (!orgId || !org) {
      return NextResponse.json({ error: 'No org found for user' }, { status: 404 })
    }

    // Look up or create Stripe customer tied to the org
    let customerId: string | undefined = org.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { org_id: orgId, supabase_user_id: user.id },
      })
      customerId = customer.id

      if (SUPABASE_CONFIGURED) {
        await service
          .from('orgs')
          .update({ stripe_customer_id: customerId })
          .eq('id', orgId)
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
      success_url: `${APP_URL}/dashboard/settings?tab=billing&checkout=success`,
      cancel_url: `${APP_URL}/dashboard/settings?tab=billing&checkout=cancelled`,
      metadata: { org_id: orgId, plan_id: planId },
      subscription_data: { metadata: { org_id: orgId, plan_id: planId } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
