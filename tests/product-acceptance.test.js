import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { computed, h, nextTick, reactive, ref, Suspense, watch } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

// Exercise the actual page/components/composables; only external capabilities are adapters.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const adapters = {
      '#app':
        'export const useRoute=()=>globalThis.acceptance.route;export const useRequestURL=()=>new URL("https://shoppe.test/products/1");export const useRequestEvent=()=>undefined;export const setResponseStatus=()=>{};export const useRouter=()=>({push(){}})',
      '#imports': 'export {useIsMobile} from "~/composables/useIsMobile"',
      '~/composables/api/products/useGetProduct':
        'export const useGetProduct=()=>globalThis.acceptance.main',
      '~/composables/api/useApiFetch':
        'export const useApiFetch=(url,options)=>globalThis.acceptance.fetch(url,options)',
      '~/stores/cartStore': 'export const useCartStore=()=>globalThis.acceptance.cart',
      '~/composables/useNotification':
        'export const NotificationTypes={SUCCESS:"success",ERROR:"error"};export const useNotification=()=>({showNotification:message=>globalThis.acceptance.notifications.push(message)})',
      './ProductCard.vue': 'export default globalThis.acceptanceComponents.ProductCard',
      swiper: 'export default class Swiper {constructor(){this.activeIndex=0} destroy(){}}',
      'swiper/modules': 'export const Pagination={}',
    }
    if (adapters[specifier])
      return { url: `data:text/javascript,${adapters[specifier]}`, shortCircuit: true }
    if (specifier.endsWith('.svg') || specifier.startsWith('swiper/css'))
      return { url: 'data:text/javascript,export default {render:()=>null}', shortCircuit: true }
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
    [
      'ProductReviews',
      'ProductSections',
      'BaseTabs',
      'BaseAccordeon',
      'BaseButton',
      'ProductGallery',
      'ProductInfo',
      'ProductSimilarItems',
      'ProductCard',
    ].map(async (name) => [
      name,
      await loadSfc(new URL(`../components/${name}.vue`, import.meta.url)),
    ]),
  ),
)
globalThis.acceptanceComponents = components
components.ProductCardList = await loadSfc(
  new URL('../components/ProductCardList.vue', import.meta.url),
)
delete globalThis.acceptanceComponents
const item = (id, category = 'rings') => ({
  id,
  category,
  title: `Product ${id}`,
  image: `/image-${id}.jpg`,
  price: 20,
  description: `Description ${id}`,
  rating: { rate: 4.5 },
})
const reviewKey = (id) => `shoppe:product-reviews:${id}`
const hasClass = (name) => (n) => String(n.props.class).split(' ').includes(name)
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}
async function setup(t, faults = {}) {
  const values = new Map()
  const listeners = new Set()
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  globalThis.localStorage = {
    getItem(key) {
      if (faults.read) throw Error('Denied')
      return values.get(key) ?? null
    },
    setItem(key, value) {
      if (faults.write) throw Error('Quota')
      values.set(key, value)
    },
    removeItem: (key) => values.delete(key),
  }
  globalThis.window = {
    innerWidth: 1440,
    matchMedia: () => ({ matches: true }),
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  }
  globalThis.Document = class {}
  globalThis.ShadowRoot = class {}
  globalThis.document = Object.assign(new Document(), { body: { style: { overflow: 'auto' } } })
  const requests = [],
    adds = []
  const states = new Map()
  const state = (category) => {
    if (!states.has(category))
      states.set(category, {
        data: ref([]),
        pending: ref(true),
        status: ref('pending'),
        error: ref(null),
      })
    return states.get(category)
  }
  const main = { data: ref(item(1)), pending: ref(false), error: ref(null), refresh() {} }
  globalThis.acceptance = {
    route: reactive({ params: { id: '1' } }),
    main,
    notifications: [],
    cart: {
      async addItem(product, quantity = 1) {
        adds.push([product.id, quantity])
        return true
      },
    },
    fetch(_, options) {
      const category = computed(() => options.params.value.category)
      const execute = () => {
        const target = state(category.value)
        target.pending.value = true
        requests.push({
          category: category.value,
          finish(products = [], error = null) {
            target.data.value = products
            target.error.value = error
            target.pending.value = false
            target.status.value = error ? 'error' : 'success'
          },
        })
      }
      watch(category, execute, { immediate: true, flush: 'sync' })
      return {
        ...Object.fromEntries(
          ['data', 'pending', 'status', 'error'].map((key) => [
            key,
            computed(() => state(category.value)[key].value),
          ]),
        ),
        refresh: execute,
      }
    },
  }
  const view = mountComponent(
    t,
    { render: () => h(Suspense, null, { default: () => h(page) }) },
    {
      components: {
        ...components,
        NuxtLink: {
          props: ['to'],
          setup:
            (props, { slots }) =>
            () =>
              h('a', { href: props.to }, slots.default?.()),
        },
      },
      decorateNode(node) {
        node.focus = () => {}
        node.select = () => {}
        node.isConnected = true
        node.addEventListener = () => {}
        node.removeEventListener = () => {}
        node.getRootNode = () => document
        node.querySelector = () => view.find((n) => n.props['aria-invalid'] === true)
        node.scrollLeft = 0
        node.scrollTop = 0
        node.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 })
        if (node.type === 'dialog') {
          node.open = false
          node.showModal = () => {
            node.open = true
          }
          node.close = () => {
            node.open = false
          }
        }
      },
    },
  )
  t.after(() => {
    view.unmount()
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    else delete globalThis.navigator
    for (const key of [
      'acceptance',
      'localStorage',
      'window',
      'document',
      'Document',
      'ShadowRoot',
    ])
      delete globalThis[key]
  })
  await settle()
  const field = (name) => view.find((n) => n.props.name === name)
  const control = (label) => view.find((n) => n.props['aria-label'] === label)
  const enter = async (name, value) => {
    const n = field(name)
    if (name === 'text') n.props['onUpdate:modelValue'](value)
    else n.props.onInput({ target: { value } })
    await nextTick()
  }
  return {
    ...view,
    values,
    requests,
    adds,
    field,
    control,
    enter,
    faults,
    main,
    async fill() {
      await enter('name', 'Remembered author')
      await enter('email', 'private@example.com')
      await enter('text', 'A complete useful review')
      view.all((n) => n.props.type === 'radio')[4].props['onUpdate:modelValue'](5)
      await nextTick()
    },
    async submit() {
      await view.find((n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
      await nextTick()
    },
    async resize(width) {
      window.innerWidth = width
      listeners.forEach((fn) => fn())
      await nextTick()
    },
    async change(id, category = 'rings') {
      globalThis.acceptance.route.params.id = String(id)
      main.data.value = item(id, category)
      await settle()
    },
  }
}

test('whole product page retains its review draft across tabs/767–768px, then replaces product-scoped reviews, viewer, share and similar items on navigation', async (t) => {
  const v = await setup(t)
  v.requests[0].finish([item(1), item(2), item(3)])
  await nextTick()
  v.all((n) => n.props.role === 'tab')[2].props.onClick()
  await v.fill()
  const originalText = v.field('text')
  v.all((n) => n.props.role === 'tab')[1].props.onClick()
  await v.resize(767)
  v.all((n) => n.type === 'button' && 'aria-expanded' in n.props)[2].props.onClick()
  await v.resize(768)
  assert.equal(v.field('text'), originalText)
  assert.equal(v.field('text').value, 'A complete useful review')
  v.find((n) => n.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  await nextTick()
  await v.submit()
  assert.match(v.text(), /Reviews \(1\)/)
  assert.equal(JSON.parse(v.values.get(reviewKey(1))).length, 1)
  assert.equal(v.find(hasClass('product-info__rating')).props['aria-label'], '4.5 out of 5')
  await v.enter('text', 'Unsent product one draft')
  await v.control('Share product').props.onClick()
  assert.equal(
    v.find((n) => n.props.readonly !== undefined).props.value,
    'https://shoppe.test/products/1',
  )
  const opener = v.find(hasClass('product-gallery__stage'))
  opener.props.onClick({ currentTarget: opener })
  await nextTick()
  v.control('Zoom in').props.onClick()
  await nextTick()
  const oldDialog = v.find((n) => n.type === 'dialog')
  assert.equal(oldDialog.open, true)
  assert.equal(v.control('Image scale').text, '150%')
  await v.change(7, 'necklaces')
  assert.equal(oldDialog.open, false)
  assert.equal(document.body.style.overflow, 'auto')
  assert.equal(v.find((n) => n.type === 'dialog').open, false)
  assert.equal(v.control('Image scale').text, '100%')
  assert.equal(
    v.find((n) => n.props.readonly !== undefined),
    undefined,
  )
  assert.equal(v.field('name').props.value, 'Remembered author')
  assert.equal(v.field('email').props.value, 'private@example.com')
  assert.equal(v.field('text').value, '')
  assert.equal(v.all((n) => n.type === 'article').length, 0)
  assert.match(v.text(), /Reviews \(0\).*Loading similar items/)
  assert.equal(v.all((n) => n.props.role === 'tab')[0].props['aria-selected'], true)
  assert.equal(v.all(hasClass('product-card')).length, 0)
  assert.ok(v.control('Share product by email').props.href.includes('products%2F7'))
  await v.control('Share product').props.onClick()
  assert.equal(
    v.find((n) => n.props.readonly !== undefined).props.value,
    'https://shoppe.test/products/7',
  )
  v.requests.at(-1).finish([item(7, 'necklaces'), item(8, 'necklaces')])
  await nextTick()
  assert.deepEqual(
    v.all(hasClass('product-card__link')).map((n) => n.props.href),
    ['/products/8'],
  )
  await v.change(1)
  assert.match(v.text(), /Reviews \(1\)/)
  assert.equal(v.all((n) => n.type === 'article').length, 1)
  assert.doesNotMatch(v.text(), /private@example.com/)
  assert.equal(v.field('text').value, '')
})

test('local review, similar request, image and clipboard failures coexist without blocking main product or cart controls', async (t) => {
  const v = await setup(t, { read: true, write: true })
  v.requests[0].finish([], Error('Unavailable'))
  await nextTick()
  assert.match(v.text(), /Unable to read saved reviews.*Unable to load similar items/)
  await v.fill()
  await v.submit()
  assert.match(v.text(), /Unable to save your review/)
  assert.equal(v.field('text').value, 'A complete useful review')
  assert.equal(v.all((n) => n.type === 'article').length, 0)
  const opener = v.find(hasClass('product-gallery__stage'))
  opener.props.onClick({ currentTarget: opener })
  await nextTick()
  v.find(hasClass('product-gallery__active-image')).props.onError()
  await nextTick()
  assert.equal(v.find((n) => n.type === 'dialog').open, false)
  assert.match(v.text(), /Image unavailable/)
  await v.control('Share product').props.onClick()
  assert.equal(globalThis.acceptance.notifications.length, 0)
  assert.equal(
    v.find((n) => n.props.readonly !== undefined).props.value,
    'https://shoppe.test/products/1',
  )
  v.control('Increase quantity').props.onClick()
  await nextTick()
  await v.find(hasClass('product-info__add-to-cart')).props.onClick()
  assert.deepEqual(v.adds, [[1, 2]])
  assert.equal(v.find((n) => n.type === 'h1').text, 'Product 1')
  v.find(hasClass('similar-items__retry')).props.onClick()
  await nextTick()
  v.requests.at(-1).finish([item(2)])
  await nextTick()
  await v.find(hasClass('product-card__button')).props.onClick({ stopPropagation() {} })
  await nextTick()
  assert.deepEqual(v.adds, [
    [1, 2],
    [2, 1],
  ])
  assert.equal(v.field('text').value, 'A complete useful review')
  v.faults.read = false
  v.faults.write = false
  await v.submit()
  assert.match(v.text(), /Reviews \(1\)/)
  assert.doesNotMatch(v.text(), /Unable to save your review/)
  assert.equal(v.all((n) => n.type === 'article').length, 1)
})
