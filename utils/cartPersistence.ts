import type { CartItem } from '~/types/cart'

type Snapshot = { version: 1; revision: number; items: unknown[] }
const STORAGE_KEY = 'cart'
const DATABASE_NAME = 'shoppe-cart'
const OBJECT_STORE = 'snapshots'
const IO_TIMEOUT_MS = 1500

function decode(value: unknown): Snapshot | null {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(data)) return { version: 1, revision: 0, items: data }
    if (
      data &&
      typeof data === 'object' &&
      data.version === 1 &&
      Number.isSafeInteger(data.revision) &&
      data.revision >= 0 &&
      Array.isArray(data.items)
    )
      return data
  } catch {}
  return null
}

// Operations own only their connection, never another tab's connection.
function indexedDbOperation(value?: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let database: IDBDatabase | undefined
    let transaction: IDBTransaction | undefined
    let settled = false
    const finish = (error?: unknown, result?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      database?.close()
      if (error) reject(error)
      else resolve(result)
    }
    const timer = setTimeout(() => {
      try {
        transaction?.abort()
      } catch {}
      finish(new Error('Cart storage timed out'))
    }, IO_TIMEOUT_MS)
    try {
      const request = window.indexedDB.open(DATABASE_NAME, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(OBJECT_STORE))
          request.result.createObjectStore(OBJECT_STORE)
      }
      request.onerror = () => finish(request.error || new Error('Cart storage unavailable'))
      request.onblocked = () => finish(new Error('Cart storage blocked'))
      request.onsuccess = () => {
        database = request.result
        if (settled) {
          database.close()
          return
        }
        try {
          transaction = database.transaction(
            OBJECT_STORE,
            value === undefined ? 'readonly' : 'readwrite',
          )
          const store = transaction.objectStore(OBJECT_STORE)
          const operation =
            value === undefined ? store.get(STORAGE_KEY) : store.put(value, STORAGE_KEY)
          let result: unknown
          operation.onsuccess = () => {
            result = operation.result
          }
          transaction.oncomplete = () => finish(undefined, result)
          transaction.onerror = () =>
            finish(transaction?.error || new Error('Cart transaction failed'))
          transaction.onabort = () =>
            finish(transaction?.error || new Error('Cart transaction aborted'))
        } catch (error) {
          finish(error)
        }
      }
    } catch (error) {
      finish(error)
    }
  })
}

// Internal seam: callers do not need the format, storage ordering or revisions.
export function createCartPersistence() {
  let revision = 0
  return {
    async restore(): Promise<unknown[]> {
      if (typeof window === 'undefined') return []
      const copies = await Promise.allSettled([
        Promise.resolve().then(() => window.localStorage.getItem(STORAGE_KEY)),
        indexedDbOperation(),
      ])
      const snapshots = copies.flatMap((copy) => {
        const snapshot = copy.status === 'fulfilled' ? decode(copy.value) : null
        return snapshot ? [snapshot] : []
      })
      const newest = snapshots.sort((a, b) => b.revision - a.revision)[0]
      revision = newest?.revision ?? 0
      return newest?.items ?? []
    },
    async save(items: CartItem[]): Promise<boolean> {
      if (typeof window === 'undefined' || revision === Number.MAX_SAFE_INTEGER) return false
      const nextRevision = Math.max(revision + 1, Date.now())
      const payload = JSON.stringify({ version: 1, revision: nextRevision, items })
      const writes = await Promise.allSettled([
        Promise.resolve().then(() => window.localStorage.setItem(STORAGE_KEY, payload)),
        indexedDbOperation(payload),
      ])
      if (!writes.some((write) => write.status === 'fulfilled')) return false
      revision = nextRevision
      return true
    },
  }
}
