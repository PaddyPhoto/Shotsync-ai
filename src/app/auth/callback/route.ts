import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Handles the PKCE exchange for magic links and OAuth callbacks.
 *
 * Returns a 200 HTML page (not a 302 redirect) so that Set-Cookie headers
 * are never stripped by Vercel's edge CDN. The page immediately redirects
 * the browser via JS once the cookies are committed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const redirectTo = `${origin}${next}`

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?detail=no_code`)
  }

  // Use a 200 HTML response so Set-Cookie headers are always respected.
  // A 302 redirect response can have its Set-Cookie headers stripped by CDNs.
  const htmlResponse = new NextResponse(
    `<!DOCTYPE html><html><head><title>Signing in…</title>` +
    `<meta http-equiv="refresh" content="0;url=${redirectTo}">` +
    `</head><body><script>window.location.replace(${JSON.stringify(redirectTo)})</script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            htmlResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (!error) return htmlResponse

  console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  return NextResponse.redirect(`${origin}/auth/error?detail=${encodeURIComponent(error.message)}`)
}
