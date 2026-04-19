/**
 * IndexedDB-backed session store for ShotSync.
 *
 * Persists the full session (cluster metadata + original image files) so that
 * completed jobs can be reopened on the same machine without re-uploading.
 *
 * DB: shotsync-sessions  (version 1)
 * Stores:
 *   sessions  — one record per job, keyed by job_history ID
 *   clusters  — one record per cluster, indexed by sessionId
 *   files     — one record per image file (ArrayBuffer), indexed by sessionId
 */

import type { SessionCluster } from '@/store/session'
import type { ViewLabel } from '@/types'

const DB_NAME = 'shotsync-sessions'
const DB_VERSION = 1

// ── Public types ──────────────────────────────────────────────────────────────

export interface SessionHeader {
  id: string            // job_history row ID (UUID)
  jobName: string
  savedAt: string       // ISO timestamp
  marketplaces: string[]
  brandId: string | null
  clusterCount: number
  imageCount: number
}

// ── Internal store shapes ─────────────────────────────────────────────────────

interface StoredSession {
  id: string
  jobName: string
  savedAt: string
  marketplaces: string[]
  brandId: string | null
  clusterCount: number
  imageCount: number
}

interface StoredClusterImage {
  id: string
  filename: string
  seqIndex: number
  viewLabel: string
  viewConfidence: number
}

interface StoredCluster {
  key: string        // `${sessionId}::${clusterId}`
  sessionId: string
  clusterId: string
  sku: string
  productName: string
  color: string
  colourCode: string
  styleNumber: string
  label: string
  category: string | null
  confirmed: boolean
  images: StoredClusterImage[]
}

interface StoredFile {
  key: string        // `${sessionId}::${imageId}`
  sessionId: string
  imageId: string
  name: string
  type: string
  data: ArrayBuffer
}

// ── IDB helpers ───────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('clusters')) {
        const cs = db.createObjectStore('clusters', { keyPath: 'key' })
        cs.createIndex('bySession', 'sessionId', { unique: false })
      }
      if (!db.objectStoreNames.contains('files')) {
        const fs = db.createObjectStore('files', { keyPath: 'key' })
        fs.createIndex('bySession', 'sessionId', { unique: false })
      }
    }

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error)
  })
}

function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(store: IDBObjectStore, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function idbDelete(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function idbGetAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function idbGetAllByIndex<T>(store: IDBObjectStore, indexName: string, value: IDBValidKey): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const idx = store.index(indexName)
    const req = idx.getAll(value)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function idbDeleteByIndex(store: IDBObjectStore, indexName: string, value: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const idx = store.index(indexName)
    const req = idx.openCursor(IDBKeyRange.only(value))
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save a session to IndexedDB. Call after a successful export.
 * Stores full file data (ArrayBuffer) so exports can be regenerated without re-upload.
 */
export async function saveSession(
  jobId: string,
  jobName: string,
  clusters: SessionCluster[],
  marketplaces: string[],
  brandId: string | null,
): Promise<void> {
  // Step 1: Read all file ArrayBuffers BEFORE opening the IDB transaction.
  // IDB transactions auto-commit when there are no pending IDB requests — doing
  // async file reads inside the transaction causes it to expire mid-write.
  const fileBuffers = new Map<string, { name: string; type: string; data: ArrayBuffer }>()
  for (const cluster of clusters) {
    for (const img of cluster.images) {
      try {
        const buffer = await img.file.arrayBuffer()
        fileBuffers.set(img.id, {
          name: img.file.name,
          type: img.file.type || 'image/jpeg',
          data: buffer,
        })
      } catch { /* skip unreadable files */ }
    }
  }

  // Step 2: Open the transaction and write everything without async gaps.
  const db = await openDB()
  const tx = db.transaction(['sessions', 'clusters', 'files'], 'readwrite')
  const sessions = tx.objectStore('sessions')
  const clustersStore = tx.objectStore('clusters')
  const filesStore = tx.objectStore('files')

  // Remove any existing data for this jobId (re-export overwrites)
  await idbDelete(sessions, jobId)
  await idbDeleteByIndex(clustersStore, 'bySession', jobId)
  await idbDeleteByIndex(filesStore, 'bySession', jobId)

  const totalImages = clusters.reduce((s, c) => s + c.images.length, 0)

  await idbPut(sessions, {
    id: jobId,
    jobName,
    savedAt: new Date().toISOString(),
    marketplaces,
    brandId,
    clusterCount: clusters.length,
    imageCount: totalImages,
  } as StoredSession)

  for (const cluster of clusters) {
    await idbPut(clustersStore, {
      key: `${jobId}::${cluster.id}`,
      sessionId: jobId,
      clusterId: cluster.id,
      sku: cluster.sku,
      productName: cluster.productName,
      color: cluster.color,
      colourCode: cluster.colourCode,
      styleNumber: cluster.styleNumber,
      label: cluster.label,
      category: cluster.category,
      confirmed: cluster.confirmed,
      images: cluster.images.map((img) => ({
        id: img.id,
        filename: img.filename,
        seqIndex: img.seqIndex,
        viewLabel: img.viewLabel,
        viewConfidence: img.viewConfidence,
      })),
    } as StoredCluster)

    for (const img of cluster.images) {
      const buf = fileBuffers.get(img.id)
      if (!buf) continue
      await idbPut(filesStore, {
        key: `${jobId}::${img.id}`,
        sessionId: jobId,
        imageId: img.id,
        name: buf.name,
        type: buf.type,
        data: buf.data,
      } as StoredFile)
    }
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(new Error('Transaction aborted'))
  })
}

/**
 * Load a session from IndexedDB. Returns null if not found.
 * Reconstitutes File objects from stored ArrayBuffers and creates fresh blob URLs.
 */
export async function loadSession(jobId: string): Promise<{
  jobName: string
  clusters: SessionCluster[]
  marketplaces: string[]
} | null> {
  const db = await openDB()

  const tx = db.transaction(['sessions', 'clusters', 'files'], 'readonly')
  const sessions = tx.objectStore('sessions')
  const clustersStore = tx.objectStore('clusters')
  const filesStore = tx.objectStore('files')

  const header = await idbGet<StoredSession>(sessions, jobId)
  if (!header) return null

  const storedClusters = await idbGetAllByIndex<StoredCluster>(clustersStore, 'bySession', jobId)
  const storedFiles = await idbGetAllByIndex<StoredFile>(filesStore, 'bySession', jobId)

  // Build a lookup map from imageId → StoredFile
  const fileMap = new Map<string, StoredFile>()
  for (const f of storedFiles) {
    fileMap.set(f.imageId, f)
  }

  // Reconstitute SessionCluster[]
  const clusters: SessionCluster[] = storedClusters.map((sc) => ({
    id: sc.clusterId,
    sku: sc.sku,
    productName: sc.productName,
    color: sc.color,
    colourCode: sc.colourCode,
    styleNumber: sc.styleNumber,
    label: sc.label,
    category: sc.category,
    confirmed: sc.confirmed,
    images: sc.images.map((imgMeta) => {
      const stored = fileMap.get(imgMeta.id)
      if (!stored) {
        // File missing — create a placeholder (shouldn't happen in normal flow)
        return null
      }
      const file = new File([stored.data], stored.name, { type: stored.type })
      const previewUrl = URL.createObjectURL(file)
      return {
        id: imgMeta.id,
        file,
        previewUrl,
        filename: imgMeta.filename,
        seqIndex: imgMeta.seqIndex,
        viewLabel: imgMeta.viewLabel as ViewLabel,
        viewConfidence: imgMeta.viewConfidence,
      }
    }).filter(Boolean) as SessionCluster['images'],
  })).filter((c) => c.images.length > 0)

  return { jobName: header.jobName, clusters, marketplaces: header.marketplaces }
}

/**
 * Quick check — does a session exist for this jobId?
 */
export async function hasSession(jobId: string): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction('sessions', 'readonly')
    const header = await idbGet<StoredSession>(tx.objectStore('sessions'), jobId)
    return !!header
  } catch {
    return false
  }
}

/**
 * Delete all session data for a jobId (header + clusters + files).
 */
export async function deleteSession(jobId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(['sessions', 'clusters', 'files'], 'readwrite')
  await idbDelete(tx.objectStore('sessions'), jobId)
  await idbDeleteByIndex(tx.objectStore('clusters'), 'bySession', jobId)
  await idbDeleteByIndex(tx.objectStore('files'), 'bySession', jobId)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * List all stored session headers (for management / "reopen" indicators).
 */
export async function listSessions(): Promise<SessionHeader[]> {
  try {
    const db = await openDB()
    const tx = db.transaction('sessions', 'readonly')
    const all = await idbGetAll<StoredSession>(tx.objectStore('sessions'))
    return all.map((s) => ({
      id: s.id,
      jobName: s.jobName,
      savedAt: s.savedAt,
      marketplaces: s.marketplaces,
      brandId: s.brandId,
      clusterCount: s.clusterCount,
      imageCount: s.imageCount,
    }))
  } catch {
    return []
  }
}
