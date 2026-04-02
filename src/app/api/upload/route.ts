import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  // Demo mode: simulate upload success without hitting Supabase
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({
      data: {
        uploaded_count: files.length,
        failed_count: 0,
        failed_files: [],
      },
    })
  }

  try {
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    const { storeImage } = await import('@/lib/pipeline/step1-store')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jobId = formData.get('job_id') as string
    if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

    const { data: job } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

    const svcSupabase = createServiceClient()
    const uploaded: string[] = []
    const failed: string[] = []

    for (const file of files) {
      const allowed = ['image/jpeg', 'image/png', 'image/jpg']
      if (!allowed.includes(file.type)) {
        failed.push(file.name)
        continue
      }

      try {
        const stored = await storeImage(file, file.name, jobId, file.size)

        let width: number | null = null
        let height: number | null = null
        try {
          const sharp = (await import('sharp')).default
          const buffer = Buffer.from(await file.arrayBuffer())
          const meta = await sharp(buffer).metadata()
          width = meta.width ?? null
          height = meta.height ?? null
        } catch {}

        await svcSupabase.from('images').insert({
          id: stored.id,
          job_id: jobId,
          original_filename: stored.original_filename,
          storage_path: stored.storage_path,
          storage_url: stored.storage_url,
          file_size: stored.file_size,
          width,
          height,
          status: 'uploaded',
        })

        uploaded.push(stored.id)
      } catch {
        failed.push(file.name)
      }
    }

    const { data: countData } = await svcSupabase
      .from('images')
      .select('id', { count: 'exact' })
      .eq('job_id', jobId)

    await svcSupabase
      .from('jobs')
      .update({ total_images: countData?.length ?? uploaded.length })
      .eq('id', jobId)

    return NextResponse.json({
      data: {
        uploaded_count: uploaded.length,
        failed_count: failed.length,
        failed_files: failed,
      },
    })
  } catch (err) {
    console.error('POST /api/upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
