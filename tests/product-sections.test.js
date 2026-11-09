import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick, ref } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '~/composables/useIsMobile')
      return {
        url: new URL('../composables/useIsMobile.ts', import.meta.url).href,
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
const [sections, tabs, accordion] = await Promise.all(
  ['ProductSections', 'BaseTabs', 'BaseAccordeon'].map((name) =>
    loadSfc(new URL(`../components/${name}.vue`, import.meta.url)),
  ),
)
const tabButtons = (view) => view.all((n) => n.props.role === 'tab')
const triggers = (view) => view.all((n) => n.type === 'button' && 'aria-expanded' in n.props)
const panels = (view) => view.all((n) => ['tabpanel', 'region'].includes(n.props.role))
async function setup(t, width = 1440, consumer = sections) {
  const listeners = new Set()
  globalThis.window = {
    innerWidth: width,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  }
  const view = mountComponent(t, consumer, {
    props: { productId: 1 },
    components: { BaseTabs: tabs, BaseAccordeon: accordion },
  })
  await nextTick()
  t.after(() => {
    view.unmount()
    delete globalThis.window
  })
  return {
    ...view,
    async resize(width) {
      window.innerWidth = width
      listeners.forEach((fn) => fn())
      await nextTick()
    },
  }
}
test('desktop defaults to Description, connects tabs and panels, and exposes actual review count', async (t) => {
  const view = await setup(t)
  assert.deepEqual(
    tabButtons(view).map((n) => n.props['aria-selected']),
    [true, false, false],
  )
  assert.deepEqual(
    tabButtons(view).map((n) => n.props.tabindex),
    [0, -1, -1],
  )
  assert.deepEqual(
    panels(view).map((n) => n.props.hidden),
    [false, true, true],
  )
  for (const [index, tab] of tabButtons(view).entries()) {
    assert.equal(tab.props['aria-controls'], panels(view)[index].props.id)
    assert.equal(panels(view)[index].props['aria-labelledby'], tab.props.id)
  }
  tabButtons(view)[1].props.onClick()
  await nextTick()
  assert.deepEqual(
    panels(view).map((n) => n.props.hidden),
    [true, false, true],
  )
  assert.match(view.text(), /0.3 kg.*15 x 10 x 1 cm.*Black, Browns, White.*Metal/)
  tabButtons(view)[2].props.onClick()
  await nextTick()
  assert.match(view.text(), /Reviews \(0\)/)
  assert.match(view.text(), /There are no reviews yet\./)
  view.props.reviewCount = 3
  await nextTick()
  assert.equal(tabButtons(view)[2].text, 'Reviews (3)')
})
test('tabs support automatic keyboard activation, wrapping, Home and End with focus', async (t) => {
  const view = await setup(t)
  let focused
  for (const tab of tabButtons(view))
    tab.focus = () => {
      focused = tab
    }
  for (const [index, key, expected] of [
    [0, 'ArrowLeft', 2],
    [2, 'ArrowRight', 0],
    [0, 'End', 2],
    [2, 'Home', 0],
  ]) {
    let prevented = false
    tabButtons(view)[index].props.onKeydown({
      key,
      preventDefault: () => {
        prevented = true
      },
      currentTarget: { parentElement: { querySelectorAll: () => tabButtons(view) } },
    })
    await nextTick()
    assert.equal(prevented, true)
    assert.equal(tabButtons(view)[expected].props['aria-selected'], true)
    assert.equal(focused, tabButtons(view)[expected])
  }
})
test('mobile starts closed, opens only one panel and closes on repeated activation at the 768px boundary', async (t) => {
  const view = await setup(t, 767)
  assert.deepEqual(
    panels(view).map((n) => n.props.hidden),
    [true, true, true],
  )
  assert.ok(panels(view).every((n) => n.props.role === 'region'))
  triggers(view)[0].props.onClick()
  await nextTick()
  triggers(view)[2].props.onClick()
  await nextTick()
  assert.deepEqual(
    triggers(view).map((n) => n.props['aria-expanded']),
    [false, false, true],
  )
  assert.equal(panels(view)[2].props['aria-labelledby'], triggers(view)[2].props.id)
  triggers(view)[2].props.onClick()
  await nextTick()
  assert.ok(panels(view).every((n) => n.props.hidden))
  await view.resize(768)
  assert.ok(panels(view).every((n) => n.props.role === 'tabpanel'))
  assert.deepEqual(
    panels(view).map((n) => n.props.hidden),
    [false, true, true],
  )
  await view.resize(767.99)
  assert.ok(panels(view).every((n) => n.props.hidden))
})
test('mobile product changes close the open section and keep native keyboard button semantics', async (t) => {
  const view = await setup(t, 390)
  for (const trigger of triggers(view)) {
    assert.equal(trigger.type, 'button')
    assert.equal(trigger.props.type, 'button')
    assert.equal(trigger.props.tabindex, undefined)
  }
  triggers(view)[1].props.onClick()
  await nextTick()
  assert.equal(panels(view)[1].props.hidden, false)
  view.props.productId = 2
  await nextTick()
  assert.ok(panels(view).every((n) => n.props.hidden))
  assert.ok(triggers(view).every((n) => n.props['aria-expanded'] === false))
  await view.resize(768)
  assert.equal(tabButtons(view)[0].props['aria-selected'], true)
})
test('a stateful slot retains one input through section/viewport changes and resets for a new product', async (t) => {
  let mounts = 0
  const draft = {
    setup() {
      mounts++
      const value = ref('')
      return () =>
        h('input', {
          value: value.value,
          onInput: (event) => {
            value.value = event.target.value
          },
        })
    },
  }
  const consumer = {
    props: ['productId'],
    setup: (props) => () =>
      h(sections, { productId: props.productId }, { reviews: () => h(draft) }),
  }
  const view = await setup(t, 1440, consumer)
  const input = () => view.find((n) => n.type === 'input')
  const original = input()
  tabButtons(view)[2].props.onClick()
  input().props.onInput({ target: { value: 'My unfinished review' } })
  await nextTick()
  tabButtons(view)[0].props.onClick()
  await nextTick()
  await view.resize(390)
  triggers(view)[2].props.onClick()
  await nextTick()
  await view.resize(768)
  tabButtons(view)[2].props.onClick()
  await nextTick()
  assert.equal(input(), original)
  assert.equal(input().props.value, 'My unfinished review')
  assert.equal(mounts, 1)
  view.props.productId = 2
  await nextTick()
  assert.equal(input().props.value, '')
  assert.notEqual(input(), original)
  assert.equal(mounts, 2)
  assert.deepEqual(
    panels(view).map((n) => n.props.hidden),
    [false, true, true],
  )
  await view.resize(390)
  assert.ok(panels(view).every((n) => n.props.hidden))
})
test('multiple section widgets produce unique control and panel IDs', async (t) => {
  const view = await setup(t, 1440, {
    render: () => h('div', [h(sections, { productId: 1 }), h(sections, { productId: 2 })]),
  })
  const ids = view.all((n) => n.props.id).map((n) => n.props.id)
  assert.equal(ids.length, new Set(ids).size)
})
