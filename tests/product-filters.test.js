import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { loadSfc, mountComponent, observeTree } from './helpers/sfc-runtime.js'
import { nextTick } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '#imports')
      return {
        url: new URL('../composables/useIsMobile.ts', import.meta.url).href,
        shortCircuit: true,
      }
    if (specifier === '~/types/api')
      return { url: new URL('../types/api.ts', import.meta.url).href, shortCircuit: true }
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
const component = await loadSfc(new URL('../components/ProductFilter.vue', import.meta.url))
const decorateNode = (element) =>
  Object.assign(element, {
    focus() {
      document.activeElement = this
    },
    querySelectorAll() {
      return observeTree(this).all(
        (child) => ['button', 'input', 'select'].includes(child.type) && !child.props.disabled,
      )
    },
  })
async function setup(t) {
  const listeners = new Set()
  globalThis.window = {
    innerWidth: 390,
    addEventListener(type, fn) {
      listeners.add(fn)
    },
    removeEventListener(type, fn) {
      listeners.delete(fn)
    },
  }
  globalThis.document = { body: { style: { overflow: 'auto' } }, activeElement: null }
  const events = []
  const view = mountComponent(t, component, {
    decorateNode,
    props: {
      filters: { search: '', category: '', sortBy: '' },
      searchDraft: '',
      categories: ['jewelery'],
      onSearch: (value) => events.push(['search', value]),
      onCategory: (value) => events.push(['category', value]),
      onSort: (value) => events.push(['sort', value]),
    },
  })
  await nextTick()
  const { unmount, find } = view
  t.after(() => {
    unmount()
    delete globalThis.window
    delete globalThis.document
  })
  const trigger = find((n) => n.props['aria-controls'] === 'catalog-filters')
  const panel = find((n) => n.props.id === 'catalog-filters')
  const search = find((n) => n.props.type === 'search')
  return {
    trigger,
    panel,
    search,
    events,
    unmount,
    find,
    async resize(width) {
      window.innerWidth = width
      listeners.forEach((fn) => fn())
      await nextTick()
    },
  }
}

test('mobile filters focus search, lock scroll and close on Escape restoring focus', async (t) => {
  const view = await setup(t)
  await view.trigger.props.onClick()
  assert.equal(view.panel.props.role, 'dialog')
  assert.equal(document.activeElement, view.search)
  assert.equal(document.body.style.overflow, 'hidden')
  let prevented = false
  view.panel.props.onKeydown({
    key: 'Escape',
    preventDefault() {
      prevented = true
    },
  })
  await nextTick()
  assert.equal(prevented, true)
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.activeElement, view.trigger)
  assert.equal(document.body.style.overflow, 'auto')
})

test('Tab cycles inside the panel and desktop resize releases scroll lock', async (t) => {
  const view = await setup(t)
  await view.trigger.props.onClick()
  const controls = view.panel.querySelectorAll()
  controls.at(-1).focus()
  view.panel.props.onKeydown({ key: 'Tab', shiftKey: false, preventDefault() {} })
  assert.equal(document.activeElement, controls[0])
  view.panel.props.onKeydown({ key: 'Tab', shiftKey: true, preventDefault() {} })
  assert.equal(document.activeElement, controls.at(-1))
  await view.resize(768)
  assert.equal(view.panel.props.role, undefined)
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.body.style.overflow, 'auto')
})

test('unmounting an open panel restores the previous scroll setting', async (t) => {
  const view = await setup(t)
  await view.trigger.props.onClick()
  view.unmount()
  assert.equal(document.body.style.overflow, 'auto')
})

test('search, category and sorting emit existing catalog contracts', async (t) => {
  const view = await setup(t)
  view.search.props.onInput({ target: { value: 'ring' } })
  view
    .find((n) => n.props['aria-label'] === 'Category')
    .props.onChange({ target: { value: 'jewelery' } })
  view
    .find((n) => n.props['aria-label'] === 'Sort products')
    .props.onChange({ target: { value: 'price-minus' } })
  assert.deepEqual(view.events, [
    ['search', 'ring'],
    ['category', 'jewelery'],
    ['sort', 'price-minus'],
  ])
})
