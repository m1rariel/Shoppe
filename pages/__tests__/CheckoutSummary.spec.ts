import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import OrderSummary from '@/components/OrderSummary.vue'
import CheckoutPage from '@/pages/checkout.vue'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/auth'
import { apiBaseURL } from '@/tests/unit/mocks/nuxt-http'

vi.mock('nuxt/app', () => import('@/tests/unit/mocks/nuxt-http'))
vi.mock('#imports', async () => ({
  ...(await import('@/tests/unit/mocks/nuxt-imports')),
  definePageMeta: vi.fn(),
  navigateTo: vi.fn(),
}))

const server = setupServer(http.post(`${apiBaseURL}/carts`, () => HttpResponse.json({ id: 1 })))

describe('checkout cart summary', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    disposePinia(pinia)
    server.resetHandlers()
  })
  afterAll(() => server.close())

  it('keeps the displayed lines and totals in sync with real cart mutations', async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().authToken = 'test-token'
    const cart = useCartStore()
    const product = {
      id: 1,
      title: 'Gold hoop',
      price: 25.25,
      category: 'jewelry',
      description: 'Gold hoop earrings',
    }
    await cart.addItem(product)

    const page = mount(CheckoutPage, {
      global: {
        plugins: [pinia],
        components: { OrderSummary },
        stubs: {
          ClientOnly: { template: '<slot />' },
          BillingDetailsForm: true,
          CheckoutCoupon: true,
          PaymentMethods: true,
          BaseButton: { template: '<button><slot /></button>' },
        },
      },
    })
    const summary = page.getComponent(OrderSummary)
    expect(summary.findAll('tbody td').map((cell) => cell.text())).toEqual(['Gold hoop', '$25.25'])
    expect(summary.findAll('tfoot td').map((cell) => cell.text())).toEqual([
      '$25.25',
      'Free shipping',
      '$25.25',
    ])

    await cart.addItem({ ...product, title: 'Updated gold hoop' })
    await flushPromises()

    expect(summary.findAll('tbody td').map((cell) => cell.text())).toEqual([
      'Updated gold hoop × 2',
      '$50.5',
    ])
    expect(summary.findAll('tfoot td').map((cell) => cell.text())).toEqual([
      '$50.5',
      'Free shipping',
      '$50.5',
    ])

    await cart.updateQuantity(product.id, 1)
    await flushPromises()
    expect(summary.findAll('tbody td').map((cell) => cell.text())).toEqual([
      'Updated gold hoop',
      '$25.25',
    ])
    expect(summary.get('.order-summary__total td').text()).toBe('$25.25')
  })
})
