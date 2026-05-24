import { NextRequest, NextResponse } from 'next/server'

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)

export async function POST(req: NextRequest) {
  if (!STRIPE_CONFIGURED) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const { getAuthUser } = await import('@/lib/supabase/server')
    const service = createServiceClient()
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await service
      .from('org_members')
      .select('orgs(stripe_customer_id)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const org = membership?.orgs as unknown as { stripe_customer_id: string | null } | null
    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

    const setupIntent = await stripe.setupIntents.create({
      customer: org.stripe_customer_id,
      payment_method_types: ['card'],
      usage: 'off_session',
    })

    return NextResponse.json({ clientSecret: setupIntent.client_secret })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Setup intent failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
