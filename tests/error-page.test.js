import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/stores/notificationStore') {
      return {
        url: 'data:text/javascript,export const useNotificationStore = () => ({visible: true, message: "Saved"})',
        shortCircuit: true,
      }
    }
    if (specifier === '#app') {
      return {
        url: 'data:text/javascript,export const clearError = (options) => globalThis.errorPageRedirects.push(options)',
        shortCircuit: true,
      }
    }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})

const { descriptor } = parse(readFileSync(new URL('../error.vue', import.meta.url), 'utf8'))
const { content } = compileScript(descriptor, { id: 'error-page', inlineTemplate: true })
const errorPage = (
  await import(
    `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(content, { mode: 'transform' })).toString('base64')}`
  )
).default
const errorContentSource = parse(
  readFileSync(new URL('../components/ErrorContent.vue', import.meta.url), 'utf8'),
).descriptor
const errorContentScript = compileScript(errorContentSource, {
  id: 'error-content',
  inlineTemplate: true,
})
const errorContent = (
  await import(
    `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(errorContentScript.content, { mode: 'transform' })).toString('base64')}`
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

test('HOMEPAGE clears the Nuxt error and redirects to the home route', (t) => {
  globalThis.errorPageRedirects = []
  const root = node('root')
  const app = renderer.createApp(errorPage, { error: { statusCode: 404 } })
  app.component('ErrorContent', errorContent)
  app.component('CartSidebar', { render: () => h('aside', { 'aria-label': 'Shopping bag' }) })
  app.component('BaseNotification', { render: () => h('div', { role: 'status' }, 'Saved') })
  app.component('NuxtLayout', {
    setup:
      (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
  })
  app.component('BaseButton', {
    setup:
      (_, { attrs, slots }) =>
      () =>
        h('button', { ...attrs, type: 'button' }, slots.default?.()),
  })
  t.after(() => {
    app.unmount()
    delete globalThis.errorPageRedirects
  })
  app.mount(root)

  assert.ok(walk(root).find((el) => el.props['aria-label'] === 'Shopping bag'))
  assert.ok(walk(root).find((el) => el.props.role === 'status'))

  const button = walk(root).find((el) => el.type === 'button')
  assert.ok(button)
  assert.ok(walk(button).some((el) => el.text === 'HOMEPAGE'))
  assert.deepEqual(globalThis.errorPageRedirects, [])
  button.props.onClick()
  assert.deepEqual(globalThis.errorPageRedirects, [{ redirect: '/' }])
})
