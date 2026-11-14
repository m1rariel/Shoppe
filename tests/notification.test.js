import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, nextTick } from 'vue'
import { createPinia, disposePinia, setActivePinia } from 'pinia'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('.svg'))
      return { url: 'data:text/javascript,export default {render:()=>null}', shortCircuit: true }
    if (specifier === '~/stores/cartStore')
      return {
        url: 'data:text/javascript,export const useCartStore=()=>globalThis.notificationCart',
        shortCircuit: true,
      }
    if (specifier === '#imports')
      return {
        url: new URL('../stores/notificationStore.ts', import.meta.url).href,
        shortCircuit: true,
      }
    if (specifier.startsWith('@/') || specifier.startsWith('~/'))
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts'))
      return {
        format: 'module',
        source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' }),
        shortCircuit: true,
      }
    return nextLoad(url, context)
  },
})
const { useNotificationStore } = await import('../stores/notificationStore.ts')
const { useNotification } = await import('../composables/useNotification.ts')
const source = readFileSync(new URL('../components/BaseNotification.vue', import.meta.url), 'utf8')
  .replace('<Teleport to="body">', '')
  .replace('</Teleport>', '')
const { descriptor } = parse(source)
const { content } = compileScript(descriptor, { id: 'notification', inlineTemplate: true })
const notificationComponent = (
  await import(
    `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(content, { mode: 'transform' })).toString('base64')}`
  )
).default
const node = (type, text = '') => ({ type, text, props: {}, children: [] })
const renderer = createRenderer({
  createElement: (type) => node(type),
  createText: (text) => node('text', text),
  createComment: (text) => node('comment', text),
  insert(child, parent, anchor) {
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
  },
  remove(child) {
    child.parent.children.splice(child.parent.children.indexOf(child), 1)
  },
  setElementText(el, text) {
    el.text = text
  },
  setText(el, text) {
    el.text = text
  },
  patchProp(el, key, previous, next) {
    el.props[key] = next
  },
  parentNode: (el) => el.parent,
  nextSibling: (el) => el.parent?.children[el.parent.children.indexOf(el) + 1] ?? null,
})
const walk = (el) => [el, ...el.children.flatMap(walk)]
function setup(t) {
  const pinia = createPinia()
  setActivePinia(pinia)
  t.after(() => disposePinia(pinia))
  return useNotificationStore()
}

test('View bag hides the notification before toggling the cart, and errors have no action', async (t) => {
  const store = setup(t)
  let toggles = 0
  globalThis.notificationCart = {
    toggleSidebar() {
      assert.equal(store.visible, false)
      toggles++
    },
  }
  const root = node('root')
  const app = renderer.createApp(notificationComponent)
  t.after(() => {
    app.unmount()
    delete globalThis.notificationCart
  })
  app.mount(root)
  store.showNotification({ message: 'Ring added', type: 'success', action: 'open-cart' })
  await nextTick()
  const button = walk(root).find((el) => el.type === 'button')
  assert.equal(button.text, 'View bag')
  assert.equal(button.props.type, 'button')
  await button.props.onClick()
  assert.equal(toggles, 1)
  assert.equal(store.action, undefined)
  assert.equal(store.actionText, '')
  assert.equal(
    walk(root).some((el) => el.type === 'button'),
    false,
  )

  store.showNotification({ message: 'Ring added', type: 'success', action: 'open-cart' })
  store.showNotification({ message: 'Save failed', type: 'error' })
  await nextTick()
  assert.equal(store.visible, true)
  assert.equal(store.action, undefined)
  assert.equal(
    walk(root).some((el) => el.type === 'button'),
    false,
  )
  assert.ok(walk(root).some((el) => el.text === 'Save failed'))
})

test('different notification consumers share one expiry timer and reset all action state', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const store = setup(t)
  const first = useNotification()
  const second = useNotification()
  first.showNotification({ message: 'First', type: 'success', action: 'open-cart' })
  t.mock.timers.tick(4000)
  second.showNotification({ message: 'Second', type: 'success', action: 'open-cart' })
  t.mock.timers.tick(1000)
  assert.equal(store.visible, true)
  assert.equal(store.message, 'Second')
  t.mock.timers.tick(3999)
  assert.equal(store.visible, true)
  t.mock.timers.tick(1)
  assert.equal(store.visible, false)
  assert.equal(store.message, '')
  assert.equal(store.action, undefined)
  assert.equal(store.actionText, '')
})
