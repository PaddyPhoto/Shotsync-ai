import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrgForUser } from './getOrgForUser'

/**
 * The AI-copy bug was caused by resolving the org with orgs.id == user.id,
 * which never matches. These tests pin the correct resolution: owner_id fast
 * path first, then an org_members fallback, and null when the user has neither.
 */

type Resolver = (table: string, filters: Record<string, unknown>) => { data: unknown }

function mockSupabase(resolve: Resolver): SupabaseClient {
  function builder(table: string) {
    const filters: Record<string, unknown> = {}
    const b = {
      select: () => b,
      eq: (col: string, val: unknown) => { filters[col] = val; return b },
      limit: () => b,
      single: async () => resolve(table, filters),
    }
    return b
  }
  return { from: (table: string) => builder(table) } as unknown as SupabaseClient
}

describe('getOrgForUser', () => {
  it('resolves via owner_id fast path (returns the owner plan)', async () => {
    const supabase = mockSupabase((table, filters) => {
      if (table === 'orgs' && filters.owner_id === 'user-1') {
        return { data: { id: 'org-1', plan: 'scale' } }
      }
      return { data: null }
    })
    const org = await getOrgForUser(supabase, 'user-1')
    expect(org?.id).toBe('org-1')
    expect(org?.plan).toBe('scale')
  })

  it('falls back to org_members for a non-owner team member', async () => {
    const supabase = mockSupabase((table, filters) => {
      if (table === 'orgs' && filters.owner_id === 'user-2') return { data: null }
      if (table === 'org_members' && filters.user_id === 'user-2') return { data: { org_id: 'org-9' } }
      if (table === 'orgs' && filters.id === 'org-9') return { data: { id: 'org-9', plan: 'growth' } }
      return { data: null }
    })
    const org = await getOrgForUser(supabase, 'user-2')
    expect(org?.id).toBe('org-9')
    expect(org?.plan).toBe('growth')
  })

  it('returns null when the user owns no org and has no membership', async () => {
    const supabase = mockSupabase(() => ({ data: null }))
    const org = await getOrgForUser(supabase, 'ghost')
    expect(org).toBeNull()
  })

  it('never matches orgs by id == user.id (the original bug)', async () => {
    // Simulate a DB where an org's *id* happens to be passed the user id —
    // the helper must NOT find an org this way; it only keys on owner_id.
    const supabase = mockSupabase((table, filters) => {
      if (table === 'orgs' && filters.id === 'user-3') return { data: { id: 'user-3', plan: 'scale' } }
      return { data: null }
    })
    const org = await getOrgForUser(supabase, 'user-3')
    expect(org).toBeNull()
  })
})
