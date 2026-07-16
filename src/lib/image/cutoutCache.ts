// ── Background-removal cutout cache ──────────────────────────────────────────
// Per-image transparent-PNG cutout returned by /api/remove-background, kept for
// the session so the lightbox can preview it and export can reuse it without
// re-removing. Keyed by SessionImage.id. Derived data — not persisted; if it's
// gone (page reload), export re-removes on demand.

type Entry = { blob: Blob; url: string }
const cache = new Map<string, Entry>()

export function getCutout(id: string): Entry | undefined {
  return cache.get(id)
}

export function hasCutout(id: string): boolean {
  return cache.has(id)
}

export function setCutout(id: string, blob: Blob): string {
  const existing = cache.get(id)
  if (existing) URL.revokeObjectURL(existing.url)
  const url = URL.createObjectURL(blob)
  cache.set(id, { blob, url })
  return url
}

export function clearCutout(id: string): void {
  const existing = cache.get(id)
  if (existing) {
    URL.revokeObjectURL(existing.url)
    cache.delete(id)
  }
}
