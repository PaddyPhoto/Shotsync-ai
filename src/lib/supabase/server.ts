import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

/**
 * Resolve the authenticated user from an API route request.
 * Tries bearer token first (Authorization header), then falls back to
 * request cookies — needed because getSession() returns null with implicit
 * auth flow when the browser client can't surface an access_token.
 */
export async function getAuthUser(req: NextRequest) {
  const service = createServiceClient()

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token) {
    const { data } = await service.auth.getUser(token)
    if (data.user) return data.user
  }

  const cookieClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data } = await cookieClient.auth.getUser()
  return data.user ?? null
}

export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        // Force all Supabase requests to bypass Next.js Data Cache
        fetch: (url: RequestInfo | URL, init?: RequestInit) =>
          fetch(url, { ...init, cache: 'no-store' }),
      },
    }
  )
}
