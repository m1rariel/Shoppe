const STORAGE_KEY = 'cart'

export function readCartStorage(): unknown {
  if (typeof window === 'undefined') return null

  try {
    const payload = window.localStorage.getItem(STORAGE_KEY)

    return payload === null ? null : JSON.parse(payload)
  } catch {
    return null
  }
}

export function writeCartStorage(value: unknown): boolean {
  if (typeof window === 'undefined') return false

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))

    return true
  } catch {
    return false
  }
}
