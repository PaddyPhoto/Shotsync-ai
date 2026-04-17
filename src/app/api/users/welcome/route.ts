import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, welcomeFreeEmail } from '@/lib/email'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

// POST /api/users/welcome — send free plan welcome email after signup
// Called client-side after supabase.auth.signUp() succeeds
export async function POST(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) return NextResponse.json({ ok: true })

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await service.auth.getUser(token)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await sendEmail(welcomeFreeEmail(user.email))
    return NextResponse.json({ ok: true })
  } catch (err) {
    // Non-fatal — don't block the user flow
    console.error('POST /api/users/welcome error:', err)
    return NextResponse.json({ ok: true })
  }
}
