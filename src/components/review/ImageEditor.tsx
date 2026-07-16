'use client'

import { useEffect, useState } from 'react'
import { useSession, type SessionImage } from '@/store/session'
import { DEFAULT_EDIT, isDefaultEdit } from '@/lib/image/adjustments'
import { getCutout, setCutout } from '@/lib/image/cutoutCache'
import { EditCanvas } from './EditCanvas'
import { EditPanel } from './EditPanel'

// The lightbox editor: live-adjusted image on the left, slider + background-
// removal panel on the right. Reads/writes the per-image recipe in the session
// store; the cutout (transparent PNG) is cached separately per image.
export function ImageEditor({ image, src }: { image: SessionImage; src: string }) {
  const edit = image.edit ?? DEFAULT_EDIT
  const updateImageEdit = useSession((s) => s.updateImageEdit)
  const resetImageEdit = useSession((s) => s.resetImageEdit)
  const applyEditToAll = useSession((s) => s.applyEditToAll)
  const setBgRemoveAll = useSession((s) => s.setBgRemoveAll)

  const [bgLoading, setBgLoading] = useState(false)
  const [bgError, setBgError] = useState<string | null>(null)
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null)

  // Sync the cached cutout when the image changes.
  useEffect(() => {
    setCutoutUrl(getCutout(image.id)?.url ?? null)
    setBgError(null)
    setBgLoading(false)
  }, [image.id])

  async function toggleBg() {
    // Turn off — keep the cutout cached, just stop using it.
    if (edit.bgRemove) { updateImageEdit(image.id, { bgRemove: false }); return }
    // Already have a cutout — just switch it on.
    if (getCutout(image.id)) { updateImageEdit(image.id, { bgRemove: true }); return }

    setBgLoading(true); setBgError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const fd = new FormData()
      fd.append('image', image.file, image.filename || 'image.jpg')
      const res = await fetch('/api/remove-background', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: fd,
      })
      if (!res.ok) {
        setBgError(
          res.status === 403 ? 'Background removal is a Growth plan feature.' :
          res.status === 503 ? 'Background removal isn’t configured yet.' :
          'Couldn’t remove the background — try again.'
        )
        return
      }
      const blob = await res.blob()
      setCutoutUrl(setCutout(image.id, blob))
      updateImageEdit(image.id, { bgRemove: true })
    } catch {
      setBgError('Couldn’t remove the background — try again.')
    } finally {
      setBgLoading(false)
    }
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
        onToggleBg={toggleBg}
        onRemoveBgAll={() => setBgRemoveAll(true)}
      />
    </div>
  )
}
