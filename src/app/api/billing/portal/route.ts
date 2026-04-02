import { NextResponse } from 'next/server'

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST() {
  if (!STRIPE_CONFIGURED) {
    return NextResponse.json({ url: `${APP_URL}/dashboard/settings?tab=billing` })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
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

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/settings?tab=billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
