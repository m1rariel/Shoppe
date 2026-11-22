import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, mount } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import BaseNotification from '~/components/BaseNotification.vue'
import { NotificationTypes, useNotification } from '~/composables/useNotification'
import { useNotificationStore } from '~/stores/notificationStore'

const cart = vi.hoisted(() => ({ toggleSidebar: vi.fn() }))
vi.mock('~/stores/cartStore', () => ({ useCartStore: () => cart }))

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  vi.useFakeTimers()
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => {
  disposePinia(pinia)
  vi.useRealTimers()
})

const showSuccess = (message: string) => ({
  message,
  type: NotificationTypes.SUCCESS,
  action: 'open-cart' as const,
})

describe('BaseNotification', () => {
  it('teleports to body and hides before opening the cart through View bag', async () => {
    const store = useNotificationStore()
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mount(BaseNotification, { attachTo: host, global: { plugins: [pinia] } })
    const body = new DOMWrapper(document.body)

    cart.toggleSidebar.mockImplementationOnce(() => {
      expect(store.visible).toBe(false)
      expect(body.find('[role="status"]').exists()).toBe(false)
    })
    store.showNotification(showSuccess('Ring added'))
    await nextTick()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(body.get('[role="status"]').text()).toContain('Ring added')
    const button = body.get('button')
    expect(button.text()).toBe('View bag')
    expect(button.attributes('type')).toBe('button')

    await button.trigger('click')

    expect(cart.toggleSidebar).toHaveBeenCalledTimes(1)
    expect(body.find('button').exists()).toBe(false)
  })

  it('replaces success with an error without retaining the cart action', async () => {
    const store = useNotificationStore()
    mount(BaseNotification, { global: { plugins: [pinia] } })
    const body = new DOMWrapper(document.body)

    store.showNotification(showSuccess('Ring added'))
    await nextTick()
    expect(body.get('button').text()).toBe('View bag')

    store.showNotification({ message: 'Save failed', type: NotificationTypes.ERROR })
    await nextTick()

    expect(body.get('[role="status"]').text()).toBe('Save failed')
    expect(body.find('button').exists()).toBe(false)
    expect(cart.toggleSidebar).not.toHaveBeenCalled()
  })

  it('shares one expiry timer across consumers and clears every notification field', () => {
    const store = useNotificationStore()
    const first = useNotification()
    const second = useNotification()

    first.showNotification(showSuccess('First'))
    vi.advanceTimersByTime(4000)
    second.showNotification(showSuccess('Second'))
    expect(vi.getTimerCount()).toBe(1)

    vi.advanceTimersByTime(1000)
    expect(store.visible).toBe(true)
    expect(store.message).toBe('Second')

    vi.advanceTimersByTime(3999)
    expect(store.visible).toBe(true)

    vi.advanceTimersByTime(1)
    expect(store.visible).toBe(false)
    expect(store.message).toBe('')
    expect(store.type).toBe(NotificationTypes.INFO)
    expect(store.action).toBeUndefined()
    expect(store.actionText).toBe('')
    expect(vi.getTimerCount()).toBe(0)
  })
})
