import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h, nextTick } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '#imports')
      return {
        url: 'data:text/javascript,export const NotificationTypes = { ERROR: "error", SUCCESS: "success" }; export const useNotification = () => ({ showNotification: async value => globalThis.footerTest.notifications.push(value) });',
        shortCircuit: true,
      }
    if (specifier.endsWith('.svg'))
      return {
        url: 'data:text/javascript,export default { render: () => null };',
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
const { descriptor } = parse(
  readFileSync(new URL('../components/BaseFooter.vue', import.meta.url), 'utf8'),
)
const compiled = compileScript(descriptor, { id: 'footer-test', inlineTemplate: true })
const source = stripTypeScriptTypes(compiled.content, { mode: 'transform' })
const { default: footer } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
)
const node = (type, text = '') => ({
  type,
  text,
  props: {},
  children: [],
  addEventListener() {},
  removeEventListener() {},
  getRootNode() {
    return globalThis.document
  },
})
const renderer = createRenderer({
  createElement: (type) => node(type),
  createText: (text) => node('text', text),
  createComment: (text) => node('comment', text),
  insert(child, parent, anchor) {
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(child)
    else parent.children.splice(index, 0, child)
  },
  remove(child) {
    child.parent.children.splice(child.parent.children.indexOf(child), 1)
  },
  setElementText(element, text) {
    element.text = text
  },
  setText(element, text) {
    element.text = text
  },
  patchProp(element, key, previous, next) {
    element.props[key] = next
  },
  parentNode: (element) => element.parent,
  nextSibling: () => null,
})
const find = (element, predicate) =>
  predicate(element)
    ? element
    : element.children.map((child) => find(child, predicate)).find(Boolean)

async function setup(t, storage = {}) {
  const values = new Map()
  const notifications = []
  globalThis.footerTest = { notifications }
  globalThis.Document = class Document {}
  globalThis.ShadowRoot = class ShadowRoot {}
  globalThis.document = new Document()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    ...storage,
  }
  const root = node('root')
  const app = renderer.createApp(footer)
  app.component('BaseButton', {
    setup(props, { attrs, slots }) {
      return () => h('button', attrs, slots.default?.())
    },
  })
  app.mount(root)
  await nextTick()
  t.after(() => {
    app.unmount()
    delete globalThis.footerTest
    delete globalThis.localStorage
    delete globalThis.document
    delete globalThis.Document
    delete globalThis.ShadowRoot
  })
  const input = find(root, (element) => element.type === 'input' && element.props.type === 'email')
  const form = find(root, (element) => element.type === 'form')
  return {
    root,
    input,
    values,
    notifications,
    async enter(value) {
      input.props['onUpdate:modelValue'](value)
      await nextTick()
    },
    async submit() {
      await form.props.onSubmit({ preventDefault() {} })
      await nextTick()
    },
  }
}

test('footer restores a saved email and saves a trimmed email with local-only feedback', async (t) => {
  const view = await setup(t, { getItem: () => 'saved@example.com' })
  assert.equal(view.input.value, 'saved@example.com')
  await view.enter('  next@example.com  ')
  await view.submit()
  assert.equal(view.values.get('shoppe:newsletter-email'), 'next@example.com')
  assert.equal(view.input.value, '')
  assert.deepEqual(view.notifications, [{ message: 'Email saved', type: 'success' }])
})

test('footer invalid email shows an error without writing storage', async (t) => {
  const view = await setup(t)
  await view.enter('invalid')
  await view.submit()
  assert.equal(view.values.size, 0)
  assert.equal(view.input.props['aria-invalid'], true)
  assert.ok(find(view.root, (element) => element.props.role === 'alert'))
})

test('footer storage write failure keeps the email for retry and reports an error', async (t) => {
  const view = await setup(t, {
    setItem() {
      throw new Error('Storage unavailable')
    },
  })
  await view.enter('retry@example.com')
  await view.submit()
  assert.equal(view.input.value, 'retry@example.com')
  assert.deepEqual(view.notifications, [
    { message: 'Unable to save email. Please try again.', type: 'error' },
  ])
})

test('native email rejection exposes the error and editing clears that rejection', async (t) => {
  const view = await setup(t)
  await view.enter('name@example..com')
  view.input.props.onInvalid()
  await nextTick()
  assert.equal(view.input.props['aria-invalid'], true)
  await view.enter('name@example.com')
  view.input.props.onInput()
  await nextTick()
  assert.equal(view.input.props['aria-invalid'], false)
})

test('footer storage read failure leaves an editable field and reports an error', async (t) => {
  const view = await setup(t, {
    getItem() {
      throw new Error('Storage unavailable')
    },
  })
  assert.equal(view.input.value, '')
  assert.deepEqual(view.notifications, [
    { message: 'Unable to restore saved email.', type: 'error' },
  ])
  await view.enter('works@example.com')
  await view.submit()
  assert.equal(view.values.get('shoppe:newsletter-email'), 'works@example.com')
})
