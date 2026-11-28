import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import checkout from '~/middleware/checkout'
import { useCartStore } from '~/stores/cartStore'
import { useAuthStore } from '~/stores/auth'

const boundary = vi.hoisted(() => ({ navigate: vi.fn(), restore: vi.fn() }))
vi.mock('nuxt/app', () => import('~/tests/unit/mocks/nuxt-http'))
vi.mock('#imports', async () => ({
  ...(await import('~/tests/unit/mocks/nuxt-imports')),
  defineNuxtRouteMiddleware: (middleware: () => Promise<unknown>) => middleware,
  navigateTo: boundary.navigate,
}))
vi.mock('~/utils/cartPersistence', () => ({
  createCartPersistence: () => ({ restore: boundary.restore, save: vi.fn() }),
}))

const savedBag = [
  {
    product: { id: 1, title: 'Gold hoop', price: 25, category: 'jewelry', description: '' },
    quantity: 1,
  },
]

describe('checkout route access', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    boundary.restore.mockResolvedValue(savedBag)
  })
  afterEach(() => disposePinia(pinia))

  // The Nuxt wrapper is identity here; the real route middleware runs against real stores.
  const enterCheckout = checkout as unknown as () => Promise<unknown>

  it('waits for the saved bag before sending a guest to sign in with a return path', async () => {
    let finishRestore!: (items: typeof savedBag) => void
    boundary.restore.mockReturnValue(new Promise((resolve) => (finishRestore = resolve)))
    const entry = enterCheckout()
    expect(boundary.navigate).not.toHaveBeenCalled()
    finishRestore(savedBag)
    await entry
    expect(useCartStore().totalItems).toBe(1)
    expect(boundary.navigate).toHaveBeenCalledWith(
      { path: '/account', query: { returnTo: '/checkout' } },
      { replace: true },
    )
  })

  it('checks the restored empty bag before guest authentication', async () => {
    boundary.restore.mockResolvedValue([])
    await enterCheckout()
    expect(boundary.navigate.mock.calls).toEqual([['/products', { replace: true }]])
  })

  it('allows an authenticated buyer with a restored bag', async () => {
    useAuthStore().authToken = 'test-token'
    await enterCheckout()
    expect(useCartStore().totalItems).toBe(1)
    expect(boundary.navigate).not.toHaveBeenCalled()
  })
})
