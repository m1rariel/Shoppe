import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, Suspense, ref, reactive, nextTick } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '#app')
      return {
        url: 'data:text/javascript,export const useRoute=()=>globalThis.reviewTest.route;export const useRequestURL=()=>new URL("https://shoppe.test/products/1");export const useRequestEvent=()=>undefined;export const setResponseStatus=()=>{}',
        shortCircuit: true,
      }
    if (specifier === '~/composables/api/products/useGetProduct')
      return {
        url: 'data:text/javascript,export const useGetProduct=()=>globalThis.reviewTest.state',
        shortCircuit: true,
      }
    if (specifier === '~/composables/useSimilarProducts')
      return {
        url: 'data:text/javascript,import {ref} from "vue"; export const useSimilarProducts=()=>({products:ref([]),loading:ref(false),error:ref(null),pendingIds:ref([]),retry(){},addToCart(){}})',
        shortCircuit: true,
      }
    if (specifier.startsWith('~/'))
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
const page = await loadSfc(new URL('../pages/products/[id].vue', import.meta.url))
const components = Object.fromEntries(
  await Promise.all(
    ['ProductReviews', 'ProductSections', 'BaseTabs', 'BaseAccordion', 'BaseButton'].map(
      async (name) => [name, await loadSfc(new URL(`../components/${name}.vue`, import.meta.url))],
    ),
  ),
)
const key = (id) => `shoppe:product-reviews:${id}`
const authorKey = 'shoppe:review-author'
const record = (extra = {}) => ({
  id: 'old',
  productId: '1',
  name: 'Earlier author',
  email: 'private@example.com',
  rating: 2,
  text: 'An earlier review',
  createdAt: '2025-01-01T00:00:00.000Z',
  ...extra,
})
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}
async function setup(t, seed = {}, faults = {}) {
  const values = new Map(Object.entries(seed))
  globalThis.localStorage = {
    getItem(k) {
      if (faults.read?.(k)) throw Error('Read denied')
      return values.get(k) ?? null
    },
    setItem(k, v) {
      if (faults.write?.(k)) throw Error('Quota exceeded')
      values.set(k, v)
    },
    removeItem(k) {
      if (faults.remove) throw Error('Remove denied')
      values.delete(k)
    },
  }
  globalThis.window = {
    innerWidth: 1440,
    addEventListener(_, fn) {
      this.listener = fn
    },
    removeEventListener() {},
  }
  globalThis.reviewTest = {
    route: reactive({ params: { id: '1' } }),
    state: {
      data: ref({ id: 1, title: 'Ring', rating: { rate: 4.5 } }),
      pending: ref(false),
      error: ref(null),
    },
  }
  let focused
  const view = mountComponent(
    t,
    { render: () => h(Suspense, null, { default: () => h(page) }) },
    {
      components: {
        ProductSimilarItems: { render: () => null },
        ...components,
        NuxtLink: { render: () => null },
        ProductGallery: { render: () => null },
        ProductInfo: {
          props: ['product'],
          setup: (props) => () => h('p', `API rating ${props.product.rating?.rate}`),
        },
      },
      decorateNode(n) {
        n.querySelector = () => view.all((el) => el.props['aria-invalid'] === true)[0]
        n.focus = () => {
          focused = n
        }
        n.addEventListener = () => {}
        n.removeEventListener = () => {}
        n.getRootNode = () => globalThis.document
      },
    },
  )
  globalThis.Document = class {}
  globalThis.ShadowRoot = class {}
  globalThis.document = new Document()
  await settle()
  t.after(() => {
    view.unmount()
    for (const k of ['reviewTest', 'localStorage', 'window', 'Document', 'ShadowRoot', 'document'])
      delete globalThis[k]
  })
  const field = (name) => view.find((n) => n.props.name === name)
  async function enter(name, value) {
    const n = field(name)
    if (name === 'text') n.props['onUpdate:modelValue'](value)
    else n.props.onInput({ target: { value } })
    await nextTick()
  }
  async function fill(values = {}) {
    for (const [name, value] of Object.entries({
      name: ' New author ',
      email: ' new@example.com ',
      text: ' A useful review ',
      ...values,
    }))
      await enter(name, value)
    view.all((n) => n.props.type === 'radio')[4].props['onUpdate:modelValue'](5)
    await nextTick()
  }
  const submit = async () => {
    await view.find((n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
    await nextTick()
  }
  const toggle = async (checked) => {
    view.find((n) => n.props.type === 'checkbox').props.onChange({ target: { checked } })
    await nextTick()
  }
  const change = async (id) => {
    globalThis.reviewTest.route.params.id = String(id)
    globalThis.reviewTest.state.data.value = { id, title: `Ring ${id}`, rating: { rate: 4.5 } }
    await nextTick()
  }
  return {
    ...view,
    values,
    faults,
    field,
    enter,
    fill,
    submit,
    toggle,
    change,
    focused: () => focused,
  }
}

test('page publishes only saved trimmed reviews, updates count, orders newest first, and keeps email private and API rating unchanged', async (t) => {
  const v = await setup(t)
  assert.match(v.text(), /Reviews \(0\).*There are no reviews yet/)
  assert.equal(v.find((n) => n.props.type === 'checkbox').props.checked, false)
  await v.fill()
  await v.submit()
  assert.match(v.text(), /Reviews \(1\)/)
  assert.match(v.text(), /saved on this device/)
  assert.equal(JSON.parse(v.values.get(key(1)))[0].name, 'New author')
  assert.doesNotMatch(v.text(), /new@example.com/)
  assert.match(v.text(), /API rating 4.5/)
  assert.equal(v.all((n) => n.type === 'time').length, 1)
  assert.equal(v.find((n) => n.props.role === 'img').props['aria-label'], '5 out of 5 stars')
  await v.fill({ name: 'Second author' })
  await v.submit()
  assert.deepEqual(
    v.all((n) => n.type === 'h3').map((n) => n.text),
    ['Second author', 'New author'],
  )
  assert.match(v.text(), /Reviews \(2\)/)
  await v.change(2)
  assert.match(v.text(), /Reviews \(0\)/)
  await v.change(1)
  assert.match(v.text(), /Reviews \(2\)/)
})

test('required errors are connected, focus first invalid field and preserve draft; exact validation boundaries apply', async (t) => {
  const v = await setup(t)
  await v.submit()
  assert.equal(v.focused(), v.field('text'))
  for (const n of v.all((n) => n.props['aria-invalid'] === true && n.props['aria-describedby']))
    assert.ok(v.find((e) => e.props.id === n.props['aria-describedby']))
  await v.fill({ name: 'x'.repeat(81), email: 'bad@address..com', text: 'x'.repeat(9) })
  await v.submit()
  assert.equal(v.values.size, 0)
  assert.equal(v.field('name').props.value.length, 81)
  await v.fill({
    name: 'x'.repeat(80),
    email: `${'x'.repeat(243)}@example.com`,
    text: 'x'.repeat(2001),
  })
  await v.submit()
  assert.equal(v.values.size, 0)
  await v.fill({
    name: ' x ',
    email: `${'x'.repeat(242)}@example.com`,
    text: ` ${'x'.repeat(2000)} `,
  })
  const radios = v.all((n) => n.props.type === 'radio')
  for (const rating of [0, 6, 2.5, NaN]) {
    radios[0].props['onUpdate:modelValue'](rating)
    await v.submit()
    assert.equal(v.values.size, 0)
  }
  radios[0].props['onUpdate:modelValue'](1)
  await v.submit()
  assert.equal(JSON.parse(v.values.get(key(1)))[0].text.length, 2000)
  await v.fill({ text: '1234567890' })
  await v.submit()
  assert.equal(JSON.parse(v.values.get(key(1))).length, 2)
})

test('malformed individual records are skipped, good records/date survive and unavailable storage never publishes or overwrites unseen reviews', async (t) => {
  const v = await setup(t, {
    [key(1)]: JSON.stringify([
      null,
      {},
      record(),
      record({ id: 'bad-date', createdAt: 'never' }),
      record({ rating: 1.5 }),
    ]),
  })
  assert.match(v.text(), /Reviews \(1\)/)
  assert.match(v.text(), /January 1, 2025/)
  await v.fill()
  v.faults.write = (k) => k === key(1)
  await v.submit()
  assert.match(v.text(), /Unable to save/)
  assert.match(v.field('text').value, /useful/)
  assert.equal(v.all((n) => n.type === 'article').length, 1)
  v.faults.write = null
  v.faults.read = (k) => k === key(2)
  v.values.set(key(2), JSON.stringify([record({ productId: '2' })]))
  await v.change(2)
  assert.match(v.text(), /Unable to read/)
  await v.fill()
  await v.submit()
  assert.equal(JSON.parse(v.values.get(key(2))).length, 1)
  v.faults.read = null
  await v.submit()
  assert.equal(JSON.parse(v.values.get(key(2))).length, 2)
})

test('author preference crosses products and reloads, contains only name/email, updates and explicit removal failure retain truthful preference', async (t) => {
  const v = await setup(t)
  await v.fill()
  await v.toggle(true)
  await v.enter('name', 'Changed')
  await v.submit()
  assert.deepEqual(JSON.parse(v.values.get(authorKey)), {
    name: 'Changed',
    email: 'new@example.com',
  })
  await v.change(2)
  assert.equal(v.field('name').props.value, 'Changed')
  assert.equal(v.field('text').value, '')
  assert.equal(v.find((n) => n.props.type === 'checkbox').props.checked, true)
  v.faults.remove = true
  await v.toggle(false)
  assert.match(v.text(), /Unable to remove/)
  assert.equal(v.find((n) => n.props.type === 'checkbox').props.checked, true)
  v.faults.remove = false
  await v.toggle(false)
  assert.equal(v.values.has(authorKey), false)
  await v.change(1)
  assert.equal(v.field('name').props.value, '')
  assert.match(v.text(), /Reviews \(1\)/)
})

test('draft survives tabs and viewport changes and resets when a new product loads', async (t) => {
  const v = await setup(t)
  await v.fill()
  const original = v.field('text')
  const tabs = () => v.all((n) => n.props.role === 'tab')
  tabs()[2].props.onClick()
  await nextTick()
  tabs()[0].props.onClick()
  await nextTick()
  window.innerWidth = 390
  window.listener()
  await nextTick()
  v.all((n) => n.type === 'button' && 'aria-expanded' in n.props)[2].props.onClick()
  await nextTick()
  assert.equal(v.field('text'), original)
  assert.match(v.field('text').value, /useful/)
  await v.change(2)
  assert.equal(v.field('text').value, '')
  assert.equal(v.field('name').props.value, '')
  globalThis.reviewTest.state.pending.value = true
  await nextTick()
  assert.equal(v.all((n) => n.type === 'form').length, 0)
})

test('saved author is restored on reload without rating or review text; corrupt top level storage remains untouched', async (t) => {
  const v = await setup(t, {
    [authorKey]: JSON.stringify({ name: 'Saved', email: 'saved@example.com' }),
    [key(1)]: '{broken',
  })
  assert.equal(v.field('name').props.value, 'Saved')
  assert.equal(v.field('text').value, '')
  assert.match(v.text(), /Unable to read/)
  await v.fill()
  await v.submit()
  assert.equal(v.values.get(key(1)), '{broken')
  assert.match(v.field('text').value, /useful/)
})

test('author read and write failures are explicit and do not opt in or lose the review draft', async (t) => {
  const faults = { read: (k) => k === authorKey, write: (k) => k === authorKey }
  const v = await setup(t, {}, faults)
  assert.match(v.text(), /Unable to restore remembered/)
  await v.fill()
  await v.toggle(true)
  assert.match(v.text(), /Unable to remember/)
  assert.equal(v.find((n) => n.props.type === 'checkbox').props.checked, false)
  assert.equal(v.values.has(authorKey), false)
  assert.match(v.field('text').value, /useful/)
  await v.submit()
  assert.match(v.text(), /Reviews \(1\)/)
})

test('restoration sorts by date and keeps newest insertion first on equal dates, including mobile counts', async (t) => {
  const date = '2026-01-01T00:00:00.000Z'
  const v = await setup(t, {
    [key(1)]: JSON.stringify([
      record(),
      record({ id: 'newest', name: 'Newest', createdAt: date }),
      record({ id: 'same-date', name: 'Previous same date', createdAt: date }),
    ]),
  })
  assert.deepEqual(
    v.all((n) => n.type === 'h3').map((n) => n.text),
    ['Newest', 'Previous same date', 'Earlier author'],
  )
  window.innerWidth = 390
  window.listener()
  await nextTick()
  const trigger = v.all((n) => n.type === 'button' && 'aria-expanded' in n.props)[2]
  assert.match(trigger.children.map((n) => n.text).join(' '), /Reviews \(3\)/)
})
