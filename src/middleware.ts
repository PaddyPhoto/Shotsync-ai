import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DASHBOARD_PREFIX = '/dashboard'
const AUTH_PATHS = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Build a response we can mutate cookies on
  let response = NextResponse.next({ request })

  // Only run auth checks when Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== 'https://your-project.supabase.co'

  if (!isConfigured) {
    // Demo mode — no auth enforcement
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        // Write cookies to both request (for downstream) and response
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Use getSession() in middleware — reads from cookie without a network call.
  // getUser() is used in API routes where server-side validation is needed.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX)
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Also check for the cookie directly as a fallback
  const hasCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  const isAuthenticated = !!session || hasCookie


  if (isDashboard && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && isAuthenticated) {
    const next = request.nextUrl.searchParams.get('next') ?? DASHBOARD_PREFIX
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = next
    dashUrl.search = ''
    return NextResponse.redirect(dashUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, fonts, etc.)
     * - API routes (they handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
