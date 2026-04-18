import { NextRequest, NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/lib/plans'
import { sendEmail, welcomePaidEmail, adminNewSubscriberEmail, paymentFailedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

async function getOrgOwnerEmail(orgId: string, service: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createServiceClient']>>): Promise<string | null> {
  const { data: member } = await service
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'owner')
    .limit(1)
    .single()
  if (!member) return null
  const { data: { user } } = await service.auth.admin.getUserById(member.user_id)
  return user?.email ?? null
}

async function sendSubscriptionEmails(orgId: string, planId: PlanId, service: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createServiceClient']>>) {
  const email = await getOrgOwnerEmail(orgId, service)
  if (!email) return
  const plan = PLANS[planId]
  await Promise.all([
    sendEmail(welcomePaidEmail(email, plan.name, planId === 'brand')),
    sendEmail(adminNewSubscriberEmail(email, plan.name, plan.priceAud, planId === 'brand')),
  ])
}

async function sendPaymentFailedEmail(orgId: string, planId: PlanId, service: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createServiceClient']>>) {
  const email = await getOrgOwnerEmail(orgId, service)
  if (!email) return
  await sendEmail(paymentFailedEmail(email, PLANS[planId].name))
}

// Map Stripe price IDs → plan IDs
function priceIdToPlan(priceId: string): PlanId | null {
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_BRAND_PRICE_ID) return 'brand'
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID) return 'scale'
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID) return 'enterprise'
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
          await sendSubscriptionEmails(orgId, planId, service)
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
        const updateFields: Record<string, unknown> = { stripe_subscription_status: sub.status }
        // Only update plan when subscription is active — ignore canceled/past_due events
        // to prevent old or cancelled subscriptions from overwriting the current plan.
        if (sub.status === 'active' || sub.status === 'trialing') {
          const priceId = sub.items.data[0]?.price?.id
          const planId = priceId ? priceIdToPlan(priceId) : null
          if (planId) updateFields.plan = planId
        }
        await service.from('orgs').update(updateFields).eq('id', orgId)
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
          const priceId = subscription.items.data[0]?.price?.id
          const planId = priceId ? priceIdToPlan(priceId) : null
          if (orgId) {
            await service.from('orgs').update({
              stripe_subscription_status: 'past_due',
            }).eq('id', orgId)
            if (planId) sendPaymentFailedEmail(orgId, planId, service).catch(() => {})
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
