/**
 * POST /api/integrations/s3/presign
 *
 * Generates presigned S3 PUT URLs for cloud export.
 * The client uploads images directly to S3 using these URLs — no data passes through our server.
 *
 * Body: { brandId: string; keys: string[] }   (keys = full S3 object keys to PUT)
 * Response: { urls: Record<string, string> }   (key → presigned PUT URL)
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { getAuthUser, createServiceClient } = await import('@/lib/supabase/server')
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { brandId: string; keys: string[] }
    const { brandId, keys } = body

    if (!brandId || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'brandId and keys required' }, { status: 400 })
    }

    // Load brand's S3 config
    const service = createServiceClient()
    const { data: brand } = await service
      .from('brands')
      .select('cloud_connections, org_id')
      .eq('id', brandId)
      .single()

    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    // Verify the user belongs to this org
    const { data: membership } = await service
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('org_id', brand.org_id)
      .single()
    if (!membership) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const connections = brand.cloud_connections as Record<string, unknown> | null
    const s3Config = connections?.s3 as {
      bucket: string; region: string; access_key_id: string; secret_access_key: string; prefix?: string
    } | undefined

    if (!s3Config?.bucket || !s3Config?.access_key_id || !s3Config?.secret_access_key) {
      return NextResponse.json({ error: 'S3 not configured for this brand' }, { status: 400 })
    }

    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

    const s3 = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.access_key_id,
        secretAccessKey: s3Config.secret_access_key,
      },
    })

    const urls: Record<string, string> = {}
    await Promise.all(keys.map(async (key) => {
      const fullKey = s3Config.prefix ? `${s3Config.prefix.replace(/\/$/, '')}/${key}` : key
      const command = new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: fullKey,
        ContentType: 'image/jpeg',
      })
      urls[key] = await getSignedUrl(s3, command, { expiresIn: 3600 })
    }))

    return NextResponse.json({ urls })
  } catch (err) {
    console.error('S3 presign error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
