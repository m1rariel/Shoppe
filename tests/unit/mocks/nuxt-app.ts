import { vi } from 'vitest'

export const useRouter = vi.fn(() => ({ push: vi.fn() }))
export const useRoute = vi.fn(() => ({ params: {} }))
export const useRequestURL = vi.fn(() => new URL('http://localhost/'))
export const useRequestEvent = vi.fn()
export const setResponseStatus = vi.fn()
