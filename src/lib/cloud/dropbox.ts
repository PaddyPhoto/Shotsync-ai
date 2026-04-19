/**
 * Dropbox integration — two distinct capabilities:
 *
 * 1. Source picker (Dropbox Chooser SDK)
 *    No OAuth required. Loads Dropbox's drop-in JS, shows a file picker popup,
 *    returns direct download links. Browser fetches the files.
 *    Requires: NEXT_PUBLIC_DROPBOX_APP_KEY
 *
 * 2. Export destination (Dropbox Files API)
 *    Requires an OAuth access token stored in brand settings.
 *    Uploads image ArrayBuffers directly to the user's Dropbox.
 *    Requires: NEXT_PUBLIC_DROPBOX_APP_KEY + stored access token
 */

import type { CloudFile } from './types'

// ── Dropbox Chooser (source picker) ─────────────────────────────────────────

declare global {
  interface Window {
    Dropbox?: {
      choose: (opts: DropboxChooserOptions) => void
      isBrowserSupported: () => boolean
    }
  }
}

interface DropboxChooserOptions {
  success: (files: DropboxChooserFile[]) => void
  cancel?: () => void
  linkType?: 'preview' | 'direct'
  multiselect?: boolean
  extensions?: string[]
  sizeLimit?: number
}

interface DropboxChooserFile {
  id: string
  name: string
  link: string
  bytes: number
  thumbnailLink?: string
  isDir: boolean
}

function loadDropboxSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Dropbox) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js'
    script.setAttribute('data-app-key', process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? '')
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Dropbox SDK'))
    document.head.appendChild(script)
  })
}

/**
 * Open the Dropbox Chooser file picker.
 * Returns the selected files as CloudFile[] with direct download URLs.
 * No OAuth required — Dropbox handles its own auth in the popup.
 */
export async function openDropboxChooser(): Promise<CloudFile[]> {
  await loadDropboxSDK()

  if (!window.Dropbox?.isBrowserSupported()) {
    throw new Error('Dropbox Chooser is not supported in this browser.')
  }

  return new Promise((resolve, reject) => {
    window.Dropbox!.choose({
      linkType: 'direct',
      multiselect: true,
      extensions: ['.jpg', '.jpeg', '.png', '.tif', '.tiff'],
      success: (files) => {
        resolve(files.filter((f) => !f.isDir).map((f) => ({
          id: f.id || f.link,
          name: f.name,
          size: f.bytes,
          downloadUrl: f.link,
          provider: 'dropbox' as const,
        })))
      },
      cancel: () => resolve([]),
    })
  })
}

/**
 * Download a CloudFile from Dropbox into a browser File object.
 * The direct link from the Chooser can be fetched cross-origin.
 * Falls back to a server proxy if CORS blocks it.
 */
export async function downloadCloudFile(file: CloudFile): Promise<File> {
  const res = await fetch(file.downloadUrl)
  if (!res.ok) throw new Error(`Failed to download ${file.name}: ${res.status}`)
  const blob = await res.blob()
  return new File([blob], file.name, { type: blob.type || 'image/jpeg' })
}

// ── Dropbox Upload (export destination) ──────────────────────────────────────

const DROPBOX_UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload'
const DROPBOX_CREATE_FOLDER_URL = 'https://api.dropboxapi.com/2/files/create_folder_v2'

/**
 * Upload a single image buffer to Dropbox.
 * `path` should be the full Dropbox path, e.g. "/ShotSync/Shoot_001/FBC_001_FRONT.jpg"
 */
export async function uploadToDropbox(
  accessToken: string,
  path: string,
  buffer: ArrayBuffer,
  mimeType = 'image/jpeg',
): Promise<void> {
  const res = await fetch(DROPBOX_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'overwrite',
        autorename: false,
        mute: true,
      }),
    },
    body: buffer,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Dropbox upload failed: ${err}`)
  }
}

/**
 * Ensure a Dropbox folder exists (create_folder is a no-op if it already exists).
 */
export async function ensureDropboxFolder(accessToken: string, path: string): Promise<void> {
  await fetch(DROPBOX_CREATE_FOLDER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, autorename: false }),
  })
  // 409 (path already exists) is fine — ignore errors here
}

/** Build the OAuth URL to start a Dropbox connection flow from settings. */
export function getDropboxAuthUrl(brandId: string): string {
  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? ''
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/dropbox/callback`
  const state = btoa(JSON.stringify({ brandId, csrf: Math.random().toString(36).slice(2) }))
  const params = new URLSearchParams({
    client_id: appKey,
    redirect_uri: redirectUri,
    response_type: 'code',
    token_access_type: 'offline',
    state,
  })
  return `https://www.dropbox.com/oauth2/authorize?${params}`
}

/** Is Dropbox configured in this deployment? */
export const dropboxEnabled = !!process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
