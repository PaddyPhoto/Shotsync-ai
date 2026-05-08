/**
 * Persists FileSystemDirectoryHandle objects in IndexedDB so ShotSync can
 * re-access the same image folder across sessions without re-prompting.
 */

const DB_NAME = 'shotsync-folders'
const DB_VERSION = 1
const STORE = 'handles'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'name' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveFolderHandle(
  name: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ name, handle, savedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getFolderHandle(
  name: string
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(name)
    req.onsuccess = () => resolve(req.result?.handle ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function listFolderHandles(): Promise<
  { name: string; handle: FileSystemDirectoryHandle; savedAt: number }[]
> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })
}

/** Request (or verify) read permission on a stored handle. Returns true if granted. */
export async function ensurePermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = await (handle as any).queryPermission({ mode: 'read' })
    if (status === 'granted') return true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handle as any).requestPermission({ mode: 'read' })
    return result === 'granted'
  } catch {
    return false
  }
}

/**
 * Search all stored folder handles for a file matching `filename`.
 * Returns the File if found, null if not.
 */
export async function findFileAcrossHandles(filename: string): Promise<File | null> {
  const handles = await listFolderHandles()
  for (const { handle } of handles) {
    const permitted = await ensurePermission(handle)
    if (!permitted) continue
    try {
      const file = await getFileFromHandle(handle, filename)
      if (file) return file
    } catch { /* folder may no longer exist */ }
  }
  return null
}

async function getFileFromHandle(
  dir: FileSystemDirectoryHandle,
  filename: string
): Promise<File | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileHandle = await (dir as any).getFileHandle(filename)
    return await fileHandle.getFile()
  } catch {
    // Not found at top level — check one level of subdirectories
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const [, entry] of (dir as any).entries()) {
        if (entry.kind === 'directory') {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fh = await (entry as any).getFileHandle(filename)
            return await fh.getFile()
          } catch { /* not in this subdir */ }
        }
      }
    } catch { /* iteration not supported */ }
    return null
  }
}
