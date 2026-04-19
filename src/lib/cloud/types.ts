// ── Shared cloud storage types ────────────────────────────────────────────────

export type CloudProvider = 'dropbox' | 'google-drive' | 's3'

/** A file returned by a cloud source picker — ready to download into the browser */
export interface CloudFile {
  id: string
  name: string
  size: number
  /** Direct URL or presigned URL the browser can fetch from */
  downloadUrl: string
  provider: CloudProvider
  /** Mime type if known */
  mimeType?: string
}

/** A cloud folder/path for S3 navigation */
export interface CloudFolder {
  key: string
  name: string
}

// ── Per-provider connection configs stored in brands.cloud_connections ─────────

export interface DropboxConnection {
  access_token: string
  refresh_token: string
  account_email: string
  /** Unix timestamp (ms) when the access token expires */
  expires_at: number
}

export interface GoogleDriveConnection {
  access_token: string
  refresh_token: string
  email: string
  expires_at: number
}

export interface S3Connection {
  bucket: string
  region: string
  access_key_id: string
  /** Stored server-side only — never returned to client */
  secret_access_key: string
  /** Optional key prefix e.g. "shoots/" */
  prefix: string
}

export interface CloudConnections {
  dropbox?: DropboxConnection
  google_drive?: GoogleDriveConnection
  s3?: S3Connection
}

// ── Upload progress for cloud export ─────────────────────────────────────────

export interface CloudUploadProgress {
  provider: CloudProvider
  done: number
  total: number
  phase: string
  error?: string
}
