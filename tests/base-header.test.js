import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick, reactive } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      '#imports':
        'export const navigateTo = (to) => globalThis.headerMocks.navigations.push(to); export const useRoute = () => ({path:"/account"})',
      '~/stores/auth': 'export const useAuthStore = () => globalThis.headerMocks.auth',
      '~/stores/cartStore': 'export const useCartStore = () => globalThis.headerMocks.cart',
      '~/composables/useNotification':
        'export const useNotification = () => ({showNotification: (payload) => globalThis.headerMocks.notifications.push(payload)})',
    }
    if (mocks[specifier])
      return { url: `data:text/javascript,${mocks[specifier]}`, shortCircuit: true }
    if (specifier.endsWith('.svg'))
      return { url: 'data:text/javascript,export default {render:()=>null}', shortCircuit: true }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})

const components = {
  BaseButton: await loadSfc(new URL('../components/BaseButton.vue', import.meta.url)),
}
components.NuxtLink = {
  props: ['to'],
  setup:
    (props, { slots }) =>
    () =>
      h('a', { href: props.to }, slots.default?.()),
}
const header = await loadSfc(new URL('../components/BaseHeader.vue', import.meta.url))

function setup(t) {
  const mocks = {
    navigations: [],
    notifications: [],
    cart: { toggleSidebar() {} },
    auth: reactive({
      authToken: null,
      get isAuthenticated() {
        return Boolean(this.authToken)
      },
      logout() {
        this.authToken = null
      },
    }),
  }
  globalThis.headerMocks = mocks
  t.after(() => {
    delete globalThis.headerMocks
  })

  return { ...mountComponent(t, header, { components }), mocks }
}

test('desktop account action navigates for guest, logs out in place with indicator, then navigates again', async (t) => {
  const view = setup(t)
  const action = () =>
    view.find(
      (node) =>
        node.type === 'button' && ['My account', 'Log out'].includes(node.props['aria-label']),
    )
  action().props.onClick()
  assert.deepEqual(view.mocks.navigations, ['/account'])
  view.mocks.auth.authToken = 'token'
  await nextTick()
  assert.equal(action().props['aria-label'], 'Log out')
  assert.ok(view.find((node) => node.props.class === 'page-header__account-indicator'))
  action().props.onClick()
  await nextTick()
  assert.equal(view.mocks.auth.authToken, null)
  assert.deepEqual(view.mocks.navigations, ['/account'])
  assert.deepEqual(view.mocks.notifications, [{ message: 'Вы вышли из аккаунта' }])
  action().props.onClick()
  assert.deepEqual(view.mocks.navigations, ['/account', '/account'])
  assert.ok(view.find((node) => node.type === 'a' && node.props.href === '/#'))
})
