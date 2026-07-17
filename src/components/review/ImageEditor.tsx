'use client'

import { useSession, type SessionImage } from '@/store/session'
import { DEFAULT_EDIT, isDefaultEdit } from '@/lib/image/adjustments'
import { EditCanvas } from './EditCanvas'
import { EditPanel } from './EditPanel'

// The lightbox editor: live-adjusted image on the left, slider panel on the
// right. Reads/writes the per-image recipe in the session store. (Background
// removal is a separate export-recipe toggle, not a per-image edit.)
export function ImageEditor({ image, src }: { image: SessionImage; src: string }) {
  const edit = image.edit ?? DEFAULT_EDIT
  const updateImageEdit = useSession((s) => s.updateImageEdit)
  const resetImageEdit = useSession((s) => s.resetImageEdit)
  const applyEditToAll = useSession((s) => s.applyEditToAll)

  return (
    <div className="flex items-start gap-4" onClick={(e) => e.stopPropagation()}>
      <EditCanvas
        src={src}
        edit={edit}
        className="max-w-full max-h-[82vh] object-contain rounded-[6px] shadow-2xl"
        style={{ userSelect: 'none' }}
      />
      <EditPanel
        edit={edit}
        isDefault={isDefaultEdit(image.edit)}
        onChange={(patch) => updateImageEdit(image.id, patch)}
        onReset={() => resetImageEdit(image.id)}
        onApplyToAll={() => applyEditToAll(image.id)}
      />
    </div>
  )
}
