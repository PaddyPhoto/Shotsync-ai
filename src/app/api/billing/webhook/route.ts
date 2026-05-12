import { NextRequest, NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/lib/plans'
import { sendEmail, welcomePaidEmail, adminNewSubscriberEmail, paymentFailedEmail, trialEndingEmail } from '@/lib/email'
import { logActivity } from '@/lib/activity'

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
    sendEmail(welcomePaidEmail(email, plan.name, planId === 'growth')),
    sendEmail(adminNewSubscriberEmail(email, plan.name, plan.priceAud, planId === 'growth')),
  ])
}

async function sendPaymentFailedEmail(orgId: string, planId: PlanId, service: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createServiceClient']>>) {
  const email = await getOrgOwnerEmail(orgId, service)
  if (!email) return
  await sendEmail(paymentFailedEmail(email, PLANS[planId].name))
}

// Map Stripe price IDs → plan IDs
function priceIdToPlan(priceId: string): PlanId | null {
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 'launch'
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_BRAND_PRICE_ID) return 'growth'
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

    console.error('[webhook] event:', event.type)

    // Use service role — webhook has no user session, verified by Stripe signature instead
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          metadata?: { org_id?: string; plan_id?: string; cancel_subs?: string }
          subscription?: string
        }
        const orgId = session.metadata?.org_id
        const planId = session.metadata?.plan_id as PlanId | undefined
        console.error('[webhook] checkout.session.completed orgId:', orgId, 'planId:', planId)

        if (orgId && planId) {
          const { error: updateError } = await service
            .from('orgs')
            .update({ plan: planId, stripe_subscription_status: 'active' })
            .eq('id', orgId)

          const cancelSubs = session.metadata?.cancel_subs
          if (cancelSubs) {
            const subIds = cancelSubs.split(',').filter(Boolean)
            await Promise.all(subIds.map(id => stripe.subscriptions.cancel(id).catch(() => {})))
          }

          if (updateError) console.error('[webhook] plan update error:', updateError.message)

          logActivity(orgId, null, 'plan.upgraded', { plan_to: planId })
          await sendSubscriptionEmails(orgId, planId, service)
        }
        break
      }

      case 'customer.subscription.updated': {
        // Only update subscription status — plan is managed exclusively via
        // checkout.session.completed so no event ordering issues can corrupt it.
        const sub = event.data.object as {
          metadata?: { org_id?: string }
          status: string
        }
        const orgId = sub.metadata?.org_id
        if (!orgId) break
        console.error('[webhook] subscription.updated orgId:', orgId, 'status:', sub.status)
        await service.from('orgs').update({ stripe_subscription_status: sub.status }).eq('id', orgId)
        break
      }

      case 'customer.subscription.deleted': {
        // Only update subscription status — do NOT reset plan to free here.
        // Plan downgrade is handled explicitly via a cancel endpoint or
        // when no active subscriptions remain on the next billing cycle.
        const sub = event.data.object as { metadata?: { org_id?: string } }
        const orgId = sub.metadata?.org_id
        console.error('[webhook] subscription.deleted orgId:', orgId)
        if (orgId) {
          await service.from('orgs').update({
            stripe_subscription_status: 'canceled',
          }).eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as { metadata?: { org_id?: string }; items: { data: { price: { id: string } }[] } }
        const orgId = sub.metadata?.org_id
        const priceId = sub.items.data[0]?.price?.id
        const planId = priceId ? priceIdToPlan(priceId) : null
        if (orgId && planId) {
          const email = await getOrgOwnerEmail(orgId, service)
          if (email) sendEmail(trialEndingEmail(email, PLANS[planId].name, PLANS[planId].priceAud)).catch(() => {})
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
          console.error('[webhook] payment_failed orgId:', orgId, 'planId:', planId)
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
