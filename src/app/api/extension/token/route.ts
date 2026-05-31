import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/supabase/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// GET — return current extension token for this user's org
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const supabase = createServiceClient()
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) return NextResponse.json({ token: null }, { headers: CORS })

  const { data: org } = await supabase
    .from('orgs')
    .select('extension_token')
    .eq('id', member.org_id)
    .single()

  return NextResponse.json({ token: org?.extension_token ?? null }, { headers: CORS })
}

// POST — generate (or regenerate) the extension token
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const supabase = createServiceClient()
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) return NextResponse.json({ error: 'No org found' }, { status: 400, headers: CORS })
  if (!['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Only owners and admins can generate API keys' }, { status: 403, headers: CORS })
  }

  const token = `ss_${crypto.randomUUID().replace(/-/g, '')}`

  const { data: org } = await supabase
    .from('orgs')
    .update({ extension_token: token })
    .eq('id', member.org_id)
    .select('extension_token')
    .single()

  return NextResponse.json({ token: org?.extension_token }, { headers: CORS })
}
