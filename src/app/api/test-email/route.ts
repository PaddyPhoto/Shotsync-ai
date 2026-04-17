import { NextResponse } from 'next/server'
import { sendEmail, welcomeFreeEmail, teamInviteEmail } from '@/lib/email'

// Temporary test route — DELETE after confirming email delivery works
export async function GET() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  try {
    await sendEmail(welcomeFreeEmail('hello@shotsync.ai'))
    return NextResponse.json({ ok: true, message: 'Test email sent to hello@shotsync.ai' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
