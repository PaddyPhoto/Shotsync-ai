import { NextRequest, NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

// Send welcome email to customer + alert to admin
async function sendSubscriptionEmails(orgId: string, planId: PlanId, service: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createServiceClient']>>) {
  if (!process.env.RESEND_API_KEY) return

  const { data: member } = await service
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'owner')
    .limit(1)
    .single()

  if (!member) return

  const { data: { user } } = await service.auth.admin.getUserById(member.user_id)
  if (!user?.email) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const plan = PLANS[planId]

  // Notify admin
  await resend.emails.send({
    from: 'hello@shotsync.ai',
    to: 'photoworkssydney@gmail.com',
    subject: `New ${plan.name} subscriber — ${user.email}`,
    html: `
      <p>A new subscriber has upgraded to the <strong>${plan.name}</strong> plan ($${plan.priceAud} AUD/month).</p>
      <p><strong>Email:</strong> ${user.email}</p>
      ${planId === 'brand' ? '<p><strong>Action required:</strong> This customer is entitled to an onboarding call — reply to their welcome email to schedule it.</p>' : ''}
    `,
  })

  // Welcome email to customer
  const onboardingLine = planId === 'brand'
    ? `<p>As part of your Brand plan, you're entitled to a 1-on-1 onboarding call with our team. Simply reply to this email and we'll get something in the calendar.</p>`
    : ''

  await resend.emails.send({
    from: 'hello@shotsync.ai',
    to: user.email,
    replyTo: 'hello@shotsync.ai',
    subject: `Welcome to ShotSync ${plan.name} — you're all set`,
    html: `
      <p>Hi there,</p>
      <p>Your <strong>ShotSync ${plan.name}</strong> plan is now active. You're ready to start processing shoots.</p>
      ${onboardingLine}
      <p>If you have any questions, just reply to this email.</p>
      <p>— The ShotSync team</p>
    `,
  })
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
