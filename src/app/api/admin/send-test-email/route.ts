import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/server'
import { sendEmail, reEngagementEmail } from '@/lib/email'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { template, email } = await req.json()
  const to: string = email?.trim() || ADMIN_EMAIL

  if (template === 're-engagement') {
    await sendEmail(reEngagementEmail(to))
    return NextResponse.json({ ok: true, to })
  }

  return NextResponse.json({ error: 'Unknown template' }, { status: 400 })
}
