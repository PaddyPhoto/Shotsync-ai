import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { PLANS, type PlanId } from '@/lib/plans'

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)
const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function POST(req: NextRequest) {
  const body = await req.json() as { planId: PlanId; annual?: boolean; currency?: 'aud' | 'usd' }
  const { planId, annual = false, currency = 'aud' } = body

  if (!planId || planId === 'free') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const plan = PLANS[planId]
  const priceId = currency === 'usd'
    ? (annual && plan.stripePriceIdUsdAnnual ? plan.stripePriceIdUsdAnnual : plan.stripePriceIdUsd)
    : (annual && plan.stripePriceIdAnnual ? plan.stripePriceIdAnnual : plan.stripePriceId)

  if (!priceId && STRIPE_CONFIGURED) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 400 })
  }

  if (!STRIPE_CONFIGURED) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    let user: { id: string; email?: string } | null = null

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

    const { data: membership } = await service
      .from('org_members')
      .select('org_id, orgs(id, stripe_customer_id, name)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const org = membership?.orgs as unknown as { id: string; stripe_customer_id: string | null; name: string } | null
    const orgId = membership?.org_id
    if (!orgId || !org) return NextResponse.json({ error: 'No org found' }, { status: 404 })

    let customerId = org.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { org_id: orgId, supabase_user_id: user.id },
      })
      customerId = customer.id
      if (SUPABASE_CONFIGURED) {
        await service.from('orgs').update({ stripe_customer_id: customerId }).eq('id', orgId)
      }
    }

    const [existing, trialing] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 10 }),
      stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 10 }),
    ])
    const allExisting = [...existing.data, ...trialing.data]
    const isNewCustomer = allExisting.length === 0
    const existingSubIds = allExisting.map(s => s.id).join(',')

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId! }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      ...(isNewCustomer ? { trial_period_days: 30 } : {}),
      metadata: { org_id: orgId, plan_id: planId, cancel_subs: existingSubIds },
    })

    const pending = (subscription as any).pending_setup_intent
    const invoice = (subscription as any).latest_invoice
    const clientSecret: string | null =
      pending?.client_secret ?? invoice?.payment_intent?.client_secret ?? null

    const intentType = pending ? 'setup' : 'payment'

    if (!clientSecret) {
      return NextResponse.json({ error: 'Could not create payment intent' }, { status: 500 })
    }

    return NextResponse.json({ clientSecret, intentType, isNewCustomer, subscriptionId: subscription.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Subscribe failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
