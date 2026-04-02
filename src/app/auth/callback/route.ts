import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles the PKCE exchange for:
 *  - Magic link sign-in (email OTP)
 *  - OAuth provider callbacks (Google, etc.)
 *
 * Supabase sends the user here with ?code=... after they click the email link.
 * We exchange the code for a session, then redirect to the dashboard (or ?next=).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Absolute redirect so the browser drops the ?code param from the URL
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  }

  // Something went wrong — send to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
