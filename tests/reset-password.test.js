import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      '#imports':
        'export const definePageMeta = (meta) => { globalThis.resetMocks.pageMeta = meta }; export const navigateTo = (to) => globalThis.resetMocks.navigations.push(to)',
      '~/composables/useNotification':
        'export const useNotification = () => ({showNotification: (payload) => globalThis.resetMocks.notifications.push(payload)})',
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

const components = {}
for (const name of ['BaseInput', 'BaseButton', 'AccountForm', 'AccountPanel']) {
  components[name] = await loadSfc(new URL(`../components/${name}.vue`, import.meta.url))
}
components.NuxtLink = {
  props: ['to'],
  setup:
    (props, { slots }) =>
    () =>
      h('a', { href: props.to }, slots.default?.()),
}
const resetPassword = await loadSfc(new URL('../pages/reset-password.vue', import.meta.url))

function setup(t) {
  const mocks = { navigations: [], notifications: [] }
  globalThis.resetMocks = mocks
  globalThis.Document = class Document {}
  t.after(() => {
    delete globalThis.resetMocks
    delete globalThis.Document
  })

  let focused
  const view = mountComponent(t, resetPassword, {
    components,
    decorateNode(element) {
      element.addEventListener = () => {}
      element.getRootNode = () => new globalThis.Document()
      element.focus = () => {
        focused = element
      }
    },
  })
  const field = (name) => view.find((node) => node.type === 'input' && node.props.name === name)
  const input = async (name, value) => {
    field(name).props['onUpdate:modelValue'](value)
    await nextTick()
  }
  const submit = async () => {
    await view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
    await nextTick()
  }
  return { ...view, mocks, field, input, submit, focused: () => focused }
}

test('reset password does not declare guest route middleware', (t) => {
  const view = setup(t)
  assert.equal(view.mocks.pageMeta, undefined)
})

test('reset validates email, notifies without navigation and retains entered email', async (t) => {
  const view = setup(t)
  assert.equal(view.field('email').props.placeholder, 'Email')
  assert.equal(view.field('email').props['aria-label'], 'Email')
  assert.equal(view.field('email').props.type, 'email')
  assert.equal(view.field('email').props.autocomplete, 'email')
  await view.input('email', 'invalid')
  await view.submit()
  assert.equal(view.focused(), view.field('email'))
  assert.deepEqual(view.mocks.notifications, [])
  await view.input('email', ' user@example.com ')
  await view.submit()
  assert.deepEqual(view.mocks.notifications, [{ message: 'Отправили пароль на email' }])
  assert.equal(view.field('email').value, ' user@example.com ')
  assert.deepEqual(view.mocks.navigations, [])
  assert.ok(view.find((node) => node.type === 'a' && node.props.href === '/account'))
})
