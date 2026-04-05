import { NextRequest, NextResponse } from 'next/server'
import type { PlanId } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

// Map Stripe price IDs → plan IDs
function priceIdToPlan(priceId: string): PlanId | null {
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID) return 'business'
  return null
}

export async function POST(req: NextRequest) {
  if (!STRIPE_CONFIGURED || !SUPABASE_CONFIGURED) {
    return NextResponse.json({ received: true })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    // Use service role — webhook has no user session, verified by Stripe signature instead
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { metadata?: { org_id?: string; plan_id?: string } }
        const orgId = session.metadata?.org_id
        const planId = session.metadata?.plan_id as PlanId | undefined
        if (orgId && planId) {
          await service
            .from('orgs')
            .update({ plan: planId, stripe_subscription_status: 'active' })
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as {
          metadata?: { org_id?: string }
          status: string
          items: { data: { price: { id: string } }[] }
        }
        const orgId = sub.metadata?.org_id
        if (!orgId) break
        const priceId = sub.items.data[0]?.price?.id
        const planId = priceId ? priceIdToPlan(priceId) : null
        await service.from('orgs').update({
          plan: planId ?? 'free',
          stripe_subscription_status: sub.status,
        }).eq('id', orgId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { metadata?: { org_id?: string } }
        const orgId = sub.metadata?.org_id
        if (orgId) {
          await service.from('orgs').update({
            plan: 'free',
            stripe_subscription_status: 'canceled',
          }).eq('id', orgId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription?: string }
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const orgId = subscription.metadata?.org_id
          if (orgId) {
            await service.from('orgs').update({
              stripe_subscription_status: 'past_due',
            }).eq('id', orgId)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error'
    console.error('Webhook error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
