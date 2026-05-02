import type { SupabaseClient } from '@supabase/supabase-js'

export interface OrgRow {
  id: string
  plan: string
  exports_this_month: number
  images_this_month: number
  images_month_year: number
  images_month_month: number
}

/**
 * Resolve the org for a given user ID.
 * Tries owner lookup first (fast path), falls back to org_members for non-owners.
 */
export async function getOrgForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgRow | null> {
  // Fast path: user is the org owner
  const { data: owned } = await supabase
    .from('orgs')
    .select('id, plan, exports_this_month, images_this_month, images_month_year, images_month_month')
    .eq('owner_id', userId)
    .limit(1)
    .single()

  if (owned) return owned as OrgRow

  // Fallback: user is a team member
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (!membership) return null

  const { data: org } = await supabase
    .from('orgs')
    .select('id, plan, exports_this_month, images_this_month, images_month_year, images_month_month')
    .eq('id', membership.org_id)
    .single()

  return (org as OrgRow) ?? null
}
