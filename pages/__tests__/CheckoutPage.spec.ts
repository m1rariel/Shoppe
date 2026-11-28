import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CheckoutPage from '~/pages/checkout.vue'
import BillingDetailsForm from '~/components/BillingDetailsForm.vue'
import BaseInput from '~/components/BaseInput.vue'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cartStore'
import { useNotificationStore } from '~/stores/notificationStore'

const boundary = vi.hoisted(() => ({
  navigate: vi.fn(),
  save: vi.fn(),
  post: vi.fn(),
  validate: vi.fn(),
}))
vi.mock('nuxt/app', () => import('~/tests/unit/mocks/nuxt-http'))
vi.mock('#imports', async () => ({
  ...(await import('~/tests/unit/mocks/nuxt-imports')),
  definePageMeta: vi.fn(),
  navigateTo: boundary.navigate,
}))
vi.mock('~/utils/cartPersistence', () => ({
  createCartPersistence: () => ({ restore: async () => [], save: boundary.save }),
}))
vi.mock('~/composables/api/carts/useAddNewCart', () => ({
  useAddNewCart: () => boundary.post,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

const deferredBilling = defineComponent({
  setup(_, { expose }) {
    expose({ validate: boundary.validate, focusInvalid: () => {} })
    return () => h('input', { 'aria-label': 'Billing details' })
  },
})

describe('CheckoutPage', () => {
  let pinia: ReturnType<typeof createPinia>
  let cart: ReturnType<typeof useCartStore>
  let auth: ReturnType<typeof useAuthStore>

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    auth = useAuthStore()
    auth.authToken = 'test-token'
    cart = useCartStore()
    await cart.initialize()
    cart.items = [
      {
        product: { id: 1, title: 'Gold hoop', price: 25, category: 'jewelry', description: '' },
        quantity: 1,
      },
    ]
    boundary.save.mockResolvedValue(true)
    boundary.post.mockResolvedValue({ id: 1 })
    boundary.validate.mockResolvedValue(true)
  })
  afterEach(() => disposePinia(pinia))

  function mountPage(realBilling = false) {
    return mount(CheckoutPage, {
      attachTo: document.body,
      global: {
        plugins: [pinia],
        components: {
          BillingDetailsForm: realBilling ? BillingDetailsForm : deferredBilling,
          BaseInput,
        },
        stubs: {
          ClientOnly: { template: '<slot />' },
          CheckoutCoupon: true,
          PaymentMethods: true,
          OrderSummary: { template: '<div><slot /></div>' },
          BaseButton: { template: '<button type="submit"><slot /></button>' },
        },
      },
    })
  }

  it('keeps entered details and focuses the first invalid field without clearing the bag', async () => {
    const page = mountPage(true)
    await page.get('input[name="firstName"]').setValue('Ada')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(page.get<HTMLInputElement>('input[name="firstName"]').element.value).toBe('Ada')
    expect(document.activeElement).toBe(page.get('input[name="lastName"]').element)
    expect(boundary.save).not.toHaveBeenCalled()
    expect(cart.totalItems).toBe(1)
    expect(boundary.navigate).not.toHaveBeenCalled()
  })

  it('blocks repeated submits while validating and saves only once', async () => {
    const validation = deferred<boolean>()
    boundary.validate.mockReturnValue(validation.promise)
    const page = mountPage()
    await page.get('form').trigger('submit')
    await page.get('form').trigger('submit')
    expect(page.get('form').attributes('aria-busy')).toBe('true')
    expect(boundary.validate).toHaveBeenCalledTimes(1)
    validation.resolve(true)
    await flushPromises()
    expect(boundary.save).toHaveBeenCalledTimes(1)
    expect(cart.totalItems).toBe(0)
    expect(useNotificationStore().message).toBe('Thank you! Your order has been placed.')
    expect(boundary.navigate.mock.calls).toEqual([['/']])
  })

  it('waits for cart completion without redirecting the temporarily empty bag to the catalog', async () => {
    const transport = deferred<void>()
    boundary.post.mockReturnValue(transport.promise)
    const page = mountPage()
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(cart.totalItems).toBe(0)
    expect(boundary.navigate).not.toHaveBeenCalled()
    await page.get('form').trigger('submit')
    expect(boundary.save).toHaveBeenCalledTimes(1)
    transport.resolve()
    await flushPromises()
    expect(boundary.navigate.mock.calls).toEqual([['/']])
  })

  it('does not start checkout while another bag mutation is pending', async () => {
    const saving = deferred<boolean>()
    boundary.save.mockReturnValue(saving.promise)
    const mutation = cart.updateQuantity(1, 2)
    const page = mountPage()
    await page.get('form').trigger('submit')
    expect(boundary.validate).not.toHaveBeenCalled()
    saving.resolve(true)
    await mutation
    expect(cart.totalItems).toBe(2)
    expect(boundary.navigate).not.toHaveBeenCalled()
  })

  it('retains the bag and shows the persistence error when local saving fails', async () => {
    boundary.save.mockResolvedValue(false)
    const page = mountPage()
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(cart.totalItems).toBe(1)
    expect(useNotificationStore().message).toBe('Не удалось сохранить корзину. Попробуйте ещё раз.')
    expect(boundary.post).not.toHaveBeenCalled()
    expect(boundary.navigate).not.toHaveBeenCalled()
    expect(page.get('form').attributes('aria-busy')).toBeUndefined()
  })

  it('completes the local order even if sending the saved bag to the API fails', async () => {
    boundary.post.mockRejectedValue(new Error('offline'))
    const page = mountPage()
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(cart.totalItems).toBe(0)
    expect(useNotificationStore().message).toBe('Thank you! Your order has been placed.')
    expect(boundary.navigate.mock.calls).toEqual([['/']])
  })

  it.each(['validation', 'saving'] as const)(
    'does not finish after logout during %s',
    async (stage) => {
      const pending = deferred<boolean>()
      if (stage === 'validation') boundary.validate.mockReturnValue(pending.promise)
      else boundary.save.mockReturnValue(pending.promise)
      const page = mountPage()
      await page.get('form').trigger('submit')
      await flushPromises()
      auth.authToken = null
      pending.resolve(true)
      await flushPromises()
      expect(boundary.navigate).toHaveBeenCalledWith({
        path: '/account',
        query: { returnTo: '/checkout' },
      })
      expect(boundary.navigate).not.toHaveBeenCalledWith('/')
      expect(useNotificationStore().message).not.toBe('Thank you! Your order has been placed.')
      if (stage === 'validation') expect(boundary.save).not.toHaveBeenCalled()
    },
  )

  it.each(['validation', 'saving'] as const)(
    'does not finish after unmount during %s',
    async (stage) => {
      const pending = deferred<boolean>()
      if (stage === 'validation') boundary.validate.mockReturnValue(pending.promise)
      else boundary.save.mockReturnValue(pending.promise)
      const page = mountPage()
      await page.get('form').trigger('submit')
      await flushPromises()
      page.unmount()
      pending.resolve(true)
      await flushPromises()
      expect(boundary.navigate).not.toHaveBeenCalled()
      expect(useNotificationStore().message).not.toBe('Thank you! Your order has been placed.')
      if (stage === 'validation') expect(boundary.save).not.toHaveBeenCalled()
    },
  )

  it('protects an open page with auth checked before the empty bag', async () => {
    mountPage()
    auth.authToken = null
    cart.items = []
    await flushPromises()
    expect(boundary.navigate.mock.calls.every(([target]) => target.path === '/account')).toBe(true)
    expect(boundary.navigate).toHaveBeenCalledWith({
      path: '/account',
      query: { returnTo: '/checkout' },
    })
  })

  it('redirects an authenticated buyer when the open bag becomes empty', async () => {
    mountPage()
    cart.items = []
    await flushPromises()
    expect(boundary.navigate).toHaveBeenCalledWith('/products')
  })
})
