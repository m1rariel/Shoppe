import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import ErrorPage from '~/error.vue'
import ErrorContent from '~/components/ErrorContent.vue'
import BaseButton from '~/components/BaseButton.vue'
import { NotificationTypes } from '~/composables/useNotification'
import { useNotificationStore } from '~/stores/notificationStore'

const { clearError } = vi.hoisted(() => ({ clearError: vi.fn() }))
vi.mock('#app', () => ({ clearError }))

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => disposePinia(pinia))

const renderError = () =>
  mount(ErrorPage, {
    props: { error: { statusCode: 404 } },
    global: {
      plugins: [pinia],
      components: {
        BaseButton,
        ErrorContent,
        CartSidebar: defineComponent({
          setup: () => () => h('aside', { 'aria-label': 'Shopping bag' }),
        }),
        BaseNotification: defineComponent({
          setup: () => {
            const store = useNotificationStore()
            return () => h('div', { role: 'status' }, store.message)
          },
        }),
        NuxtLayout: defineComponent({
          setup:
            (_, { slots }) =>
            () =>
              h('main', slots.default?.()),
        }),
      },
    },
  })

describe('ErrorPage', () => {
  it('clears the Nuxt error and redirects home after the HOMEPAGE click', async () => {
    const wrapper = renderError()

    expect(wrapper.get('main h1').text()).toBe('404 ERROR')
    expect(wrapper.find('[aria-label="Shopping bag"]').exists()).toBe(true)
    expect(wrapper.get('button').text()).toBe('HOMEPAGE')
    expect(clearError).not.toHaveBeenCalled()

    await wrapper.get('button').trigger('click')

    expect(clearError).toHaveBeenCalledExactlyOnceWith({ redirect: '/' })
  })

  it('keeps the cart available while showing and hiding a notification', async () => {
    const store = useNotificationStore()
    store.showNotification({ message: 'Saved', type: NotificationTypes.SUCCESS })
    const wrapper = renderError()

    expect(wrapper.get('[role="status"]').text()).toBe('Saved')
    expect(wrapper.find('[aria-label="Shopping bag"]').exists()).toBe(true)

    store.hideNotification()
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Shopping bag"]').exists()).toBe(true)
  })
})
