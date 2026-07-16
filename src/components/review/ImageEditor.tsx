'use client'

import { useEffect, useState } from 'react'
import { useSession, type SessionImage } from '@/store/session'
import { DEFAULT_EDIT, isDefaultEdit } from '@/lib/image/adjustments'
import { getCutout, setCutout } from '@/lib/image/cutoutCache'
import { buildColorPreservedCutout } from '@/lib/image/composite'
import { EditCanvas } from './EditCanvas'
import { EditPanel } from './EditPanel'

async function getToken(): Promise<string | undefined> {
  const { createClient } = await import('@/lib/supabase/client')
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token
}

class RemovalError extends Error { constructor(public status: number) { super(String(status)) } }

// Remove bg via the API, then apply the returned MASK to the original pixels so
// the subject's colours are preserved exactly. Returns a colour-preserved cutout.
async function removeAndPreserve(img: SessionImage, token: string | undefined): Promise<Blob> {
  const fd = new FormData()
  fd.append('image', img.file, img.filename || 'image.jpg')
  const res = await fetch('/api/remove-background', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) throw new RemovalError(res.status)
  const apiCutout = await res.blob()
  return buildColorPreservedCutout(img.file, apiCutout)
}

const removalMessage = (status?: number) =>
  status === 403 ? 'Background removal is a Growth plan feature.' :
  status === 503 ? 'Background removal isn’t configured yet.' :
  'Couldn’t remove the background — try again.'

export function ImageEditor({ image, src }: { image: SessionImage; src: string }) {
  const edit = image.edit ?? DEFAULT_EDIT
  const clusters = useSession((s) => s.clusters)
  const updateImageEdit = useSession((s) => s.updateImageEdit)
  const resetImageEdit = useSession((s) => s.resetImageEdit)
  const applyEditToAll = useSession((s) => s.applyEditToAll)
  const setBgRemoveAll = useSession((s) => s.setBgRemoveAll)

  const [bgLoading, setBgLoading] = useState(false)
  const [bgError, setBgError] = useState<string | null>(null)
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null)
  const [bgAll, setBgAll] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    setCutoutUrl(getCutout(image.id)?.url ?? null)
    setBgError(null)
    setBgLoading(false)
  }, [image.id])

  async function toggleBg() {
    if (edit.bgRemove) { updateImageEdit(image.id, { bgRemove: false }); return }
    if (getCutout(image.id)) { updateImageEdit(image.id, { bgRemove: true }); return }

    setBgLoading(true); setBgError(null)
    try {
      const blob = await removeAndPreserve(image, await getToken())
      setCutoutUrl(setCutout(image.id, blob))
      updateImageEdit(image.id, { bgRemove: true })
    } catch (e) {
      setBgError(removalMessage(e instanceof RemovalError ? e.status : undefined))
    } finally {
      setBgLoading(false)
    }
  }

  // Batch: remove background on every session image that doesn't have one yet.
  async function removeBgAll() {
    const all = clusters.flatMap((c) => c.images)
    const todo = all.filter((i) => !getCutout(i.id))
    if (todo.length === 0) { setBgRemoveAll(true); return }

    setBgError(null)
    let done = all.length - todo.length
    setBgAll({ done, total: all.length })
    const token = await getToken()
    let fatal: number | undefined
    let next = 0
    const worker = async () => {
      while (next < todo.length && fatal === undefined) {
        const im = todo[next++]
        try {
          setCutout(im.id, await removeAndPreserve(im, token))
        } catch (e) {
          if (e instanceof RemovalError && (e.status === 403 || e.status === 503)) { fatal = e.status; break }
        }
        done++
        setBgAll({ done, total: all.length })
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setBgAll(null)
    if (fatal !== undefined) { setBgError(removalMessage(fatal)); return }
    setBgRemoveAll(true)
    setCutoutUrl(getCutout(image.id)?.url ?? null)
  }

  const showCutout = edit.bgRemove && !!cutoutUrl

  return (
    <div className="flex items-start gap-4" onClick={(e) => e.stopPropagation()}>
      <EditCanvas
        src={showCutout ? cutoutUrl! : src}
        edit={edit}
        onWhite={showCutout}
        className="max-w-full max-h-[82vh] object-contain rounded-[6px] shadow-2xl"
        style={{ userSelect: 'none' }}
      />
      <EditPanel
        edit={edit}
        isDefault={isDefaultEdit(image.edit)}
        onChange={(patch) => updateImageEdit(image.id, patch)}
        onReset={() => resetImageEdit(image.id)}
        onApplyToAll={() => applyEditToAll(image.id)}
        bgLoading={bgLoading}
        bgError={bgError}
        bgAll={bgAll}
        onToggleBg={toggleBg}
        onRemoveBgAll={removeBgAll}
      />
    </div>
  )
}
