/**
 * GET /api/integrations/google/list
 *
 * Lists image files and folders in the brand's connected Google Drive.
 * Uses the stored refresh token to obtain a short-lived access token server-side —
 * no browser OAuth popup needed.
 *
 * Query params: brandId, folderId (optional, defaults to 'root')
 * Response: { files: CloudFile[], folders: { id, name }[], accessToken: string }
 */

import { NextRequest, NextResponse } from 'next/server'

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/heic']

export async function GET(req: NextRequest) {
  try {
    const { getAuthUser, createServiceClient } = await import('@/lib/supabase/server')
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')
    const folderId = searchParams.get('folderId') ?? 'root'

    if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 })

    const service = createServiceClient()
    const { data: brand } = await service
      .from('brands')
      .select('cloud_connections, org_id')
      .eq('id', brandId)
      .single()

    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    // Allow if user owns the org directly, or is an org member
    if (brand.org_id !== user.id) {
      const { data: membership } = await service
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('org_id', brand.org_id)
        .single()
      if (!membership) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connections = brand.cloud_connections as Record<string, unknown> | null
    const gdrive = connections?.google_drive as { refresh_token?: string } | undefined

    if (!gdrive?.refresh_token) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 })
    }

    // Exchange refresh token for a short-lived access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: gdrive.refresh_token,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Google token refresh failed:', err)
      return NextResponse.json(
        { error: 'Token refresh failed. Please reconnect Google Drive in Settings.' },
        { status: 401 },
      )
    }

    const { access_token } = await tokenRes.json() as { access_token: string }

    // List files and folders in the requested folder
    const mimeQuery = IMAGE_MIMES.map((m) => `mimeType='${m}'`).join(' or ')
    const q = `'${folderId}' in parents and trashed=false and (mimeType='application/vnd.google-apps.folder' or ${mimeQuery})`

    const params = new URLSearchParams({
      q,
      fields: 'files(id,name,size,mimeType)',
      pageSize: '200',
      orderBy: 'folder,name',
    })

    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!listRes.ok) {
      console.error('Drive list error:', await listRes.text())
      return NextResponse.json({ error: 'Failed to list Google Drive files' }, { status: 500 })
    }

    const { files: driveFiles } = await listRes.json() as {
      files: Array<{ id: string; name: string; size?: string; mimeType: string }>
    }

    const folders = driveFiles
      .filter((f) => f.mimeType === 'application/vnd.google-apps.folder')
      .map((f) => ({ id: f.id, name: f.name }))

    const files = driveFiles
      .filter((f) => f.mimeType !== 'application/vnd.google-apps.folder')
      .map((f) => ({
        id: f.id,
        name: f.name,
        size: parseInt(f.size ?? '0'),
        downloadUrl: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
        provider: 'google-drive' as const,
        mimeType: f.mimeType,
      }))

    return NextResponse.json({ files, folders, accessToken: access_token })
  } catch (err) {
    console.error('Google Drive list error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
