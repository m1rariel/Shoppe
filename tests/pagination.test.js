import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
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
const { descriptor } = parse(
  readFileSync(new URL('../components/BasePagination.vue', import.meta.url), 'utf8'),
)
const compiled = compileScript(descriptor, {
  id: 'pagination-test',
  inlineTemplate: true,
  templateOptions: { compilerOptions: { hoistStatic: false } },
})
// This component has only type-only props declarations, stripped by compileScript.
const { stripTypeScriptTypes } = await import('node:module')
const { default: component } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(compiled.content, { mode: 'transform' })).toString('base64')}`
)
const node = (type, text = '') => ({ type, text, props: {}, children: [] })
const renderer = createRenderer({
  createElement: (type) => node(type),
  createText: (text) => node('text', text),
  createComment: (text) => node('comment', text),
  insert(child, parent) {
    child.parent = parent
    parent.children.push(child)
  },
  remove() {},
  setElementText(element, text) {
    element.text = text
  },
  setText(element, text) {
    element.text = text
  },
  patchProp(element, key, prev, next) {
    element.props[key] = next
  },
  parentNode: (element) => element.parent,
  nextSibling: () => null,
})
const walk = (node) => [node, ...node.children.flatMap(walk)]
function setup(t, currentPage, totalPages, visiblePages) {
  const events = []
  const root = node('root')
  const app = renderer.createApp(component, {
    currentPage,
    totalPages,
    visiblePages,
    onChangePage: (page) => events.push(page),
  })
  app.component('BaseButton', {
    props: ['buttonType'],
    setup(props, { attrs, slots }) {
      return () => h('button', { ...attrs, type: props.buttonType }, slots.default?.())
    },
  })
  app.mount(root)
  t.after(() => app.unmount())
  return { events, buttons: walk(root).filter((n) => n.type === 'button'), nodes: walk(root) }
}
for (const total of [0, 1])
  test(`pagination is absent with ${total} pages`, (t) => {
    const view = setup(t, 1, total, total ? [1] : [])
    assert.equal(view.buttons.length, 0)
    assert.equal(
      view.nodes.some((n) => n.type === 'nav'),
      false,
    )
  })
test('current page is announced and is a no-op, next page emits once', (t) => {
  const view = setup(t, 1, 4, [1, 2, 3])
  const current = view.buttons.find((n) => n.props['aria-current'] === 'page')
  assert.equal(current.props['aria-label'], 'Page 1')
  current.props.onClick()
  assert.deepEqual(view.events, [])
  view.buttons.find((n) => n.props['aria-label'] === 'Next page').props.onClick()
  assert.deepEqual(view.events, [2])
})
test('last page has no next button and permits returning to earlier pages', (t) => {
  const view = setup(t, 4, 4, [2, 3, 4])
  assert.equal(
    view.buttons.some((n) => n.props['aria-label'] === 'Next page'),
    false,
  )
  view.buttons.find((n) => n.props['aria-label'] === 'Page 2').props.onClick()
  assert.deepEqual(view.events, [2])
})
