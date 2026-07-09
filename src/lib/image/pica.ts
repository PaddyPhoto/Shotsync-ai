// Shared pica instance for high-quality (Lanczos3) client-side image resizing.
// Lazy-loaded so pica's worker/wasm code never runs during SSR, and so a single
// worker pool is reused across the import (normalize) and export resample paths.
import type { Pica } from 'pica'

let _pica: Pica | null = null

export async function getPica(): Promise<Pica> {
  if (!_pica) {
    const pica = (await import('pica')).default
    _pica = pica()
  }
  return _pica
}
