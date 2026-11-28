import { shallowMount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import defaultLayout from '@/layouts/default.vue'

vi.mock('@/components/BaseHeader.vue', () => ({ default: { template: '<header />' } }))
vi.mock('@/components/BaseFooter.vue', () => ({ default: { template: '<footer />' } }))
vi.mock('@/components/BaseNotification.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/MobileMenu.vue', () => ({ default: { template: '<aside />' } }))

const renderLayout = (path: string) => {
  const route = reactive({ path })
  const view = shallowMount(defaultLayout, {
    global: {
      mocks: { $route: route },
      stubs: {
        MobileMenu: {
          props: ['hideSearch'],
          template: '<aside><input v-if="!hideSearch" aria-label="Search products" /></aside>',
        },
      },
    },
  })

  return { view, route }
}

describe('default layout', () => {
  it('keeps catalog search and layout stable when Pages adds a trailing slash', async () => {
    const { view, route } = renderLayout('/products')
    expect(view.find('input[aria-label="Search products"]').exists()).toBe(true)
    expect(view.classes()).toContain('layout--catalog')

    route.path = '/products/'
    await nextTick()

    expect(view.find('input[aria-label="Search products"]').exists()).toBe(true)
    expect(view.classes()).toContain('layout--catalog')
    view.unmount()
  })

  it.each(['/products/3024', '/products/3024/', '/checkout', '/checkout/'])(
    'keeps the compact mobile header on %s',
    (path) => {
      const { view } = renderLayout(path)
      expect(view.find('input[aria-label="Search products"]').exists()).toBe(false)
      view.unmount()
    },
  )
})
