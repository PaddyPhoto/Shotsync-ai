/**
 * GET /api/integrations/s3/list
 *
 * Lists objects in the brand's S3 bucket for the source picker.
 * Returns image files (jpg/png/tiff) and folder prefixes.
 *
 * Query params: brandId, prefix (optional — folder to navigate into)
 * Response: { files: CloudFile[], folders: CloudFolder[] }
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { getAuthUser, createServiceClient } = await import('@/lib/supabase/server')
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')
    const prefix = searchParams.get('prefix') ?? ''

    if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 })

    const service = createServiceClient()
    const { data: brand } = await service
      .from('brands')
      .select('cloud_connections, org_id')
      .eq('id', brandId)
      .single()

    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

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

    if (!s3Config?.bucket) return NextResponse.json({ error: 'S3 not configured' }, { status: 400 })

    const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

    const s3 = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.access_key_id,
        secretAccessKey: s3Config.secret_access_key,
      },
    })

    const basePrefix = s3Config.prefix ? `${s3Config.prefix.replace(/\/$/, '')}/` : ''
    const listPrefix = prefix ? `${basePrefix}${prefix}` : basePrefix

    const { Contents, CommonPrefixes } = await s3.send(new ListObjectsV2Command({
      Bucket: s3Config.bucket,
      Prefix: listPrefix,
      Delimiter: '/',
      MaxKeys: 500,
    }))

    const IMAGE_EXT = /\.(jpg|jpeg|png|tif|tiff)$/i

    // Generate presigned GET URLs for image files
    const files = await Promise.all(
      (Contents ?? [])
        .filter((obj: { Key?: string }) => obj.Key && IMAGE_EXT.test(obj.Key) && !obj.Key.endsWith('/'))
        .map(async (obj: { Key?: string; Size?: number }) => {
          const key = obj.Key!
          const name = key.split('/').pop() ?? key
          const relativeKey = key.slice(basePrefix.length)
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: s3Config.bucket, Key: key }),
            { expiresIn: 3600 },
          )
          return {
            id: relativeKey,
            name,
            size: obj.Size ?? 0,
            downloadUrl: url,
            provider: 's3' as const,
          }
        })
    )

    const folders = (CommonPrefixes ?? [])
      .filter((cp: { Prefix?: string }) => cp.Prefix)
      .map((cp: { Prefix?: string }) => {
        const fullPrefix = cp.Prefix!
        const relativePrefix = fullPrefix.slice(basePrefix.length)
        const name = relativePrefix.replace(/\/$/, '').split('/').pop() ?? relativePrefix
        return { key: relativePrefix, name }
      })

    return NextResponse.json({ files, folders })
  } catch (err) {
    console.error('S3 list error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
