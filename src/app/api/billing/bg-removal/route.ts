/**
 * POST /api/billing/bg-removal
 *
 * Records background removal usage after a successful export.
 * Creates a Stripe pending invoice item on the customer's account
 * so it appears on their next monthly invoice.
 *
 * Rate: $0.16 AUD per image (unit_amount: 16 cents AUD)
 *
 * Body: { count: number, jobName?: string }
 *
 * Supabase migration required:
 *   create table if not exists public.bg_removal_usage (
 *     id uuid default gen_random_uuid() primary key,
 *     org_id uuid references public.orgs(id) on delete cascade,
 *     images_count integer not null,
 *     job_name text,
 *     stripe_invoice_item_id text,
 *     created_at timestamptz default now()
 *   );
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const AUD_CENTS_PER_IMAGE = 16 // $0.16 AUD

const STRIPE_CONFIGURED = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
)

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 10, 60_000)) return rateLimitResponse()

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ ok: true }) // demo mode — no billing
  }

  let count: number
  let jobName: string | undefined
  try {
    const body = await req.json()
    count = Number(body.count)
    jobName = body.jobName
    if (!count || count < 1) return NextResponse.json({ error: 'Invalid count' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    // Auth via bearer token
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await service.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get org + stripe customer
    const { data: membership } = await service
      .from('org_members')
      .select('org_id, orgs(id, stripe_customer_id)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const org = membership?.orgs as unknown as { id: string; stripe_customer_id: string | null } | null
    const orgId = org?.id
    if (!orgId) return NextResponse.json({ error: 'No org found' }, { status: 404 })

    let stripeInvoiceItemId: string | null = null

    // Create Stripe pending invoice item
    if (STRIPE_CONFIGURED && org.stripe_customer_id) {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

      const item = await stripe.invoiceItems.create({
        customer: org.stripe_customer_id,
        amount: count * AUD_CENTS_PER_IMAGE,
        currency: 'aud',
        description: jobName
          ? `Background removal — ${count} image${count !== 1 ? 's' : ''} @ $0.16 AUD each (${jobName})`
          : `Background removal — ${count} image${count !== 1 ? 's' : ''} @ $0.16 AUD each`,
      })
      stripeInvoiceItemId = item.id
    }

    // Log to Supabase (best-effort — don't fail the request if table doesn't exist yet)
    try {
      await service.from('bg_removal_usage').insert({
        org_id: orgId,
        images_count: count,
        job_name: jobName ?? null,
        stripe_invoice_item_id: stripeInvoiceItemId,
      })
    } catch { /* table may not exist yet — Stripe is source of truth */ }

    return NextResponse.json({ ok: true, count, total_aud: (count * AUD_CENTS_PER_IMAGE / 100).toFixed(2) })
  } catch (err) {
    console.error('[bg-removal billing] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Billing failed' }, { status: 500 })
  }
}
