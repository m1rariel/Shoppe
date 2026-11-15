import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick, reactive } from 'vue'
import { loadSfc, mountComponent, observeTree } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '#imports')
      return {
        url: `data:text/javascript,export { useIsMobile } from '${new URL('../composables/useIsMobile.ts', import.meta.url).href}'; export const useRoute = () => globalThis.menuMocks.route; export const useRouter = () => globalThis.menuMocks.router`,
        shortCircuit: true,
      }
    if (specifier === '~/stores/cartStore')
      return {
        url: 'data:text/javascript,export const useCartStore = () => globalThis.menuMocks.cart',
        shortCircuit: true,
      }
    if (specifier === '~/stores/auth')
      return {
        url: 'data:text/javascript,export const useAuthStore = () => globalThis.menuMocks.auth',
        shortCircuit: true,
      }
    if (specifier === '~/composables/useNotification')
      return {
        url: 'data:text/javascript,export const useNotification = () => ({ showNotification: (payload) => globalThis.menuMocks.notifications.push(payload) })',
        shortCircuit: true,
      }
    if (specifier.endsWith('.svg'))
      return {
        url: 'data:text/javascript,export default { render: () => null }',
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
const component = await loadSfc(new URL('../components/MobileMenu.vue', import.meta.url))

async function setup(t, props = {}) {
  const listeners = new Set()
  globalThis.window = {
    innerWidth: 320,
    addEventListener(type, fn) {
      listeners.add(fn)
    },
    removeEventListener(type, fn) {
      listeners.delete(fn)
    },
  }
  globalThis.document = { body: { style: { overflow: 'auto' } }, activeElement: null }
  const navigations = []
  const route = reactive({ fullPath: '/' })
  const cart = reactive({
    totalItems: 2,
    isSidebarOpen: false,
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    },
  })
  const notifications = []
  const auth = reactive({
    isAuthenticated: false,
    logout() {
      this.isAuthenticated = false
    },
  })
  globalThis.menuMocks = {
    route,
    cart,
    auth,
    notifications,
    router: { push: (to) => navigations.push(to) },
  }
  const view = mountComponent(t, component, {
    props,
    components: {
      NuxtLink: {
        props: ['to'],
        setup:
          (props, { slots }) =>
          () =>
            h('a', { href: props.to }, slots.default?.()),
      },
      BaseButton: {
        setup:
          (_, { slots }) =>
          () =>
            h('button', { type: 'button' }, slots.default?.()),
      },
    },
    decorateNode(element) {
      element.tagName = element.type.toUpperCase()
      element.addEventListener = () => {}
      element.focus = () => {
        document.activeElement = element
      }
      element.querySelectorAll = () =>
        observeTree(element).all(
          (child) => ['a', 'button', 'input'].includes(child.type) && !child.props.disabled,
        )
    },
  })
  await nextTick()
  const { find, unmount } = view
  t.after(() => {
    unmount()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.menuMocks
  })
  const trigger = find((n) => n.props['aria-controls'] === 'mobile-navigation')
  return {
    find,
    trigger,
    cart,
    auth,
    notifications,
    route,
    navigations,
    unmount,
    async open() {
      trigger.focus()
      await trigger.props.onClick()
      await nextTick()
    },
    async resize(width) {
      window.innerWidth = width
      listeners.forEach((fn) => fn())
      await nextTick()
    },
  }
}

test('menu focuses search, traps Tab, and Escape restores focus and scroll', async (t) => {
  const view = await setup(t)
  await view.open()
  const panel = view.find((n) => n.props.role === 'dialog')
  assert.equal(panel.props['aria-modal'], true)
  assert.equal(document.activeElement.props.type, 'search')
  assert.equal(document.body.style.overflow, 'hidden')
  const controls = panel.querySelectorAll()
  controls.at(-1).focus()
  panel.props.onKeydown({ key: 'Tab', preventDefault() {} })
  assert.equal(document.activeElement, controls[0])
  panel.props.onKeydown({ key: 'Tab', shiftKey: true, preventDefault() {} })
  assert.equal(document.activeElement, controls.at(-1))
  panel.props.onKeydown({ key: 'Escape', preventDefault() {} })
  await nextTick()
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.activeElement, view.trigger)
  assert.equal(document.body.style.overflow, 'auto')
})

test('search submits trimmed catalog query, including empty search with hideSearch', async (t) => {
  const view = await setup(t, { hideSearch: true })
  assert.equal(
    view.find((n) => n.props.type === 'search'),
    undefined,
  )
  await view.open()
  view.find((n) => n.props.type === 'search').props['onUpdate:modelValue']('  gold ring  ')
  view.find((n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  await nextTick()
  assert.deepEqual(view.navigations, [{ path: '/products', query: { search: 'gold ring' } }])
  assert.equal(view.trigger.props['aria-expanded'], false)
  await view.open()
  view.find((n) => n.props.type === 'search').props['onUpdate:modelValue']('   ')
  view.find((n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(view.navigations.at(-1), { path: '/products', query: {} })
})

test('route changes, desktop resize and unmount release the menu scroll lock', async (t) => {
  const view = await setup(t)
  await view.open()
  view.route.fullPath = '/products'
  await nextTick()
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.body.style.overflow, 'auto')
  await view.open()
  await view.resize(768)
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.body.style.overflow, 'auto')
  await view.resize(320)
  document.body.style.overflow = 'clip'
  await view.open()
  view.unmount()
  assert.equal(document.body.style.overflow, 'clip')
})

test('cart opening closes menu without restoring focus over the cart', async (t) => {
  const view = await setup(t)
  await view.open()
  const cartButton = view.find((n) => n.props['aria-label'] === 'Open shopping bag (2 items)')
  cartButton.focus()
  cartButton.props.onClick()
  await nextTick()
  assert.equal(view.cart.isSidebarOpen, true)
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.activeElement, cartButton)
  assert.equal(document.body.style.overflow, 'auto')
  view.cart.isSidebarOpen = false
  await view.open()
  view.cart.isSidebarOpen = true
  await nextTick()
  assert.equal(view.trigger.props['aria-expanded'], false)
})

test('account and logo links close the menu; guest has no logout action', async (t) => {
  const view = await setup(t)
  for (const href of ['/account', '/']) {
    await view.open()
    const link = view.find((n) => n.type === 'a' && n.props.href === href)
    link.props.onClick()
    await nextTick()
    assert.equal(view.trigger.props['aria-expanded'], false)
  }
  assert.equal(
    view.find((n) => n.type === 'span' && n.text === 'Logout'),
    undefined,
  )
})

test('authenticated logout retains URL and cart, closes menu and restores focus and scroll', async (t) => {
  const view = await setup(t)
  view.auth.isAuthenticated = true
  await view.open()
  const label = view.find((n) => n.type === 'span' && n.text === 'Logout')
  label.parent.props.onClick()
  await nextTick()
  assert.equal(view.auth.isAuthenticated, false)
  assert.equal(view.route.fullPath, '/')
  assert.deepEqual(view.navigations, [])
  assert.equal(view.cart.totalItems, 2)
  assert.equal(document.activeElement, view.trigger)
  assert.equal(document.body.style.overflow, 'auto')
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.deepEqual(view.notifications, [{ message: 'Вы вышли из аккаунта' }])
})
