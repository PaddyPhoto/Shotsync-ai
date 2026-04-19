/**
 * Google Drive integration — source picker + export destination.
 *
 * Source: Google Picker API (OAuth popup inline — no pre-stored token needed)
 * Export: Google Drive Files API (uses token obtained during picker auth)
 *
 * Requires:
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID   — OAuth 2.0 client ID
 *   NEXT_PUBLIC_GOOGLE_API_KEY     — Browser API key (for Picker)
 */

import type { CloudFile } from './types'

declare global {
  interface Window {
    gapi?: {
      load: (lib: string, cb: () => void) => void
      client: {
        init: (opts: object) => Promise<void>
        drive?: { files?: { get: (opts: object) => Promise<{ body: string }> } }
      }
    }
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (opts: object) => { requestAccessToken: (opts?: object) => void }
        }
      }
      picker: {
        PickerBuilder: new () => GooglePickerBuilder
        DocsView: new (type?: string) => GoogleDocsView
        ViewId: { DOCS: string; FOLDERS: string }
        Feature: { MULTISELECT_ENABLED: string; SUPPORT_DRIVES: string }
        Action: { PICKED: string; CANCEL: string }
      }
    }
  }
}

interface GooglePickerBuilder {
  addView: (view: unknown) => GooglePickerBuilder
  enableFeature: (feature: string) => GooglePickerBuilder
  setOAuthToken: (token: string) => GooglePickerBuilder
  setDeveloperKey: (key: string) => GooglePickerBuilder
  setCallback: (fn: (data: GooglePickerResponse) => void) => GooglePickerBuilder
  setTitle: (title: string) => GooglePickerBuilder
  build: () => { setVisible: (v: boolean) => void }
}

interface GoogleDocsView {
  setMimeTypes: (types: string) => GoogleDocsView
  setMode: (mode: string) => GoogleDocsView
}

interface GooglePickerResponse {
  action: string
  docs?: Array<{
    id: string
    name: string
    sizeBytes: number
    mimeType: string
  }>
}

let _gapiLoaded = false
let _gisLoaded = false
let _accessToken: string | null = null
let _tokenExpiry = 0

function loadGapi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (_gapiLoaded) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => {
      window.gapi!.load('picker', () => { _gapiLoaded = true; resolve() })
    }
    script.onerror = () => reject(new Error('Failed to load Google API'))
    document.head.appendChild(script)
  })
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (_gisLoaded) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => { _gisLoaded = true; resolve() }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

function requestGoogleToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
      callback: (response: { access_token?: string; error?: string; expires_in?: number }) => {
        if (response.error) { reject(new Error(response.error)); return }
        _accessToken = response.access_token ?? null
        _tokenExpiry = Date.now() + ((response.expires_in ?? 3600) * 1000)
        resolve(_accessToken ?? '')
      },
    })
    client.requestAccessToken({ prompt: _accessToken ? '' : 'consent' })
  })
}

async function getGoogleToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken
  return requestGoogleToken()
}

/**
 * Open the Google Drive Picker.
 * Returns selected image files as CloudFile[].
 * OAuth popup appears automatically if not already authed.
 */
export async function openGoogleDrivePicker(): Promise<CloudFile[]> {
  await Promise.all([loadGapi(), loadGis()])
  const token = await getGoogleToken()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? ''

  return new Promise((resolve) => {
    const docsView = new window.google!.picker.DocsView()
    ;(docsView as unknown as { setMimeTypes: (t: string) => void }).setMimeTypes('image/jpeg,image/png,image/tiff')

    const picker = new window.google!.picker.PickerBuilder()
      .addView(docsView)
      .enableFeature(window.google!.picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(window.google!.picker.Feature.SUPPORT_DRIVES)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setTitle('Select images from Google Drive')
      .setCallback((data: GooglePickerResponse) => {
        if (data.action === window.google!.picker.Action.PICKED) {
          resolve((data.docs ?? []).map((doc) => ({
            id: doc.id,
            name: doc.name,
            size: doc.sizeBytes,
            // Download URL using the Drive files.get endpoint (requires token at fetch time)
            downloadUrl: `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
            provider: 'google-drive' as const,
            mimeType: doc.mimeType,
          })))
        } else if (data.action === window.google!.picker.Action.CANCEL) {
          resolve([])
        }
      })
      .build()

    picker.setVisible(true)
  })
}

/**
 * Download a Google Drive file into a browser File object.
 * Uses the current OAuth token for auth (must have been obtained from picker session).
 */
export async function downloadGoogleDriveFile(file: CloudFile): Promise<File> {
  const token = await getGoogleToken()
  const res = await fetch(file.downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to download ${file.name}: ${res.status}`)
  const blob = await res.blob()
  return new File([blob], file.name, { type: file.mimeType || blob.type || 'image/jpeg' })
}

// ── Google Drive Upload (export destination) ──────────────────────────────────

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'

/** Create a folder in Google Drive. Returns the folder ID. */
export async function createDriveFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const meta: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' }
  if (parentId) meta.parents = [parentId]

  // Check if folder already exists
  const params = new URLSearchParams({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder'${parentId ? ` and '${parentId}' in parents` : ''} and trashed=false`,
    fields: 'files(id)',
  })
  const searchRes = await fetch(`${DRIVE_FILES_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (searchRes.ok) {
    const { files } = await searchRes.json() as { files: { id: string }[] }
    if (files?.[0]?.id) return files[0].id
  }

  const res = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  })
  if (!res.ok) throw new Error(`Failed to create Drive folder: ${await res.text()}`)
  const { id } = await res.json() as { id: string }
  return id
}

/**
 * Upload a single image to Google Drive.
 * `parentFolderId` is the Drive folder to put it in.
 */
export async function uploadToDrive(
  accessToken: string,
  filename: string,
  buffer: ArrayBuffer,
  parentFolderId?: string,
  mimeType = 'image/jpeg',
): Promise<void> {
  const meta: Record<string, unknown> = { name: filename, mimeType }
  if (parentFolderId) meta.parents = [parentFolderId]

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file', new Blob([buffer], { type: mimeType }))

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Drive upload failed: ${await res.text()}`)
}

/** Get the current in-memory access token (available after a picker session). */
export function getCurrentGoogleToken(): string | null {
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken
  return null
}

/** Build the OAuth URL to connect Google Drive from settings (server-side flow). */
export function getGoogleAuthUrl(brandId: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
  const state = btoa(JSON.stringify({ brandId, csrf: Math.random().toString(36).slice(2) }))
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export const googleDriveEnabled = !!(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY
)
