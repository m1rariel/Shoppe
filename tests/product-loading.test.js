import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'
import { h, Suspense, ref, reactive, nextTick } from 'vue'
const { createProductApi } = await import(
  new URL('../scripts/fixtures/product-api.mjs', import.meta.url)
)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '#app')
      return {
        url: 'data:text/javascript,export const useRoute=()=>globalThis.loadingTest.route; export const useRequestURL=()=>new URL("https://shoppe.test/products/1");export const useRequestEvent=()=>undefined; export const setResponseStatus=()=>{}',
        shortCircuit: true,
      }
    if (specifier === '~/composables/api/products/useGetProduct')
      return {
        url: 'data:text/javascript,export const useGetProduct=(id)=>{globalThis.loadingTest.id=id; return globalThis.loadingTest.state}',
        shortCircuit: true,
      }
    if (specifier === '~/composables/useSimilarProducts')
      return {
        url: 'data:text/javascript,import {ref} from "vue"; export const useSimilarProducts=()=>({products:ref([]),loading:ref(false),error:ref(null),pendingIds:ref([]),retry(){},addToCart(){}})',
        shortCircuit: true,
      }
    if (specifier === '~/composables/useIsMobile')
      return {
        url: new URL('../composables/useIsMobile.ts', import.meta.url).href,
        shortCircuit: true,
      }
    if (specifier.startsWith('~/composables/useProductReviews') || specifier.startsWith('~/utils/'))
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
const [sections, tabs, accordion] = await Promise.all(
  ['ProductSections', 'BaseTabs', 'BaseAccordeon'].map((name) =>
    loadSfc(new URL(`../components/${name}.vue`, import.meta.url)),
  ),
)
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}
async function mount(t, initial = {}) {
  const state = {
    data: ref(null),
    pending: ref(false),
    error: ref(null),
    refresh: () => {},
    ...initial,
  }
  globalThis.loadingTest = { route: reactive({ params: { id: '1' } }), state }
  globalThis.window = { innerWidth: 1440, addEventListener() {}, removeEventListener() {} }
  const view = mountComponent(
    t,
    { render: () => h(Suspense, null, { default: () => h(page) }) },
    {
      components: {
        BaseButton: {
          setup:
            (_, { slots, attrs }) =>
            () =>
              h('button', attrs, slots.default?.()),
        },
        NuxtLink: {
          props: ['to'],
          setup:
            (props, { slots }) =>
            () =>
              h('a', { href: props.to }, slots.default?.()),
        },
        ProductGallery: {
          props: ['images', 'productTitle'],
          setup: (props) => () => h('gallery', { images: props.images, title: props.productTitle }),
        },
        ProductInfo: {
          props: ['product', 'productUrl'],
          setup: (props) => () =>
            h('h1', { 'data-product-url': props.productUrl }, props.product.title),
        },
        ProductSections: sections,
        ProductReviews: { render: () => null },
        ProductSimilarItems: { render: () => null },
        BaseTabs: tabs,
        BaseAccordeon: accordion,
      },
    },
  )
  await settle()
  t.after(() => {
    view.unmount()
    delete globalThis.loadingTest
    delete globalThis.window
  })
  return {
    state,
    all: view.all,
    text: view.text,
  }
}
const sectionWidgets = (view) =>
  view.all((el) => String(el.props.class).split(' ').includes('product-sections'))
const sectionTabs = (view) => view.all((el) => el.props.role === 'tab')
test('delayed loading hides old content and then displays the product', async (t) => {
  const view = await mount(t, { pending: ref(true) })
  assert.match(view.text(), /Loading product…/)
  assert.equal(sectionWidgets(view).length, 0)
  view.state.data.value = { id: 1, title: 'First fixture' }
  view.state.pending.value = false
  await nextTick()
  assert.match(view.text(), /First fixture/)
  assert.equal(sectionTabs(view)[0].props['aria-selected'], true)
  globalThis.loadingTest.route.params.id = '2'
  assert.equal(globalThis.loadingTest.id.value, '2')
  view.state.pending.value = true
  await nextTick()
  assert.doesNotMatch(view.text(), /First fixture/)
  assert.equal(sectionWidgets(view).length, 0)
  view.state.data.value = { id: 2, title: 'Second fixture' }
  view.state.pending.value = false
  await nextTick()
  assert.match(view.text(), /Second fixture/)
  assert.equal(sectionTabs(view)[0].props['aria-selected'], true)
  assert.doesNotMatch(view.text(), /First fixture/)
})
test('real sections reset for route changes and unmount for loading, errors and missing products with stale data', async (t) => {
  const view = await mount(t, { data: ref({ id: 1, title: 'First ring' }) })
  sectionTabs(view)[2].props.onClick()
  await nextTick()
  assert.equal(sectionTabs(view)[2].props['aria-selected'], true)

  globalThis.loadingTest.route.params.id = '2'
  view.state.data.value = { id: 2, title: 'Second ring' }
  await nextTick()
  assert.equal(sectionTabs(view)[0].props['aria-selected'], true)
  assert.doesNotMatch(view.text(), /First ring/)

  for (const state of ['loading', 'error', 'not-found', 'empty']) {
    // Keep the previous response in data to reproduce Nuxt's cached-data states.
    view.state.pending.value = state === 'loading'
    view.state.error.value =
      state === 'error' ? { statusCode: 503 } : state === 'not-found' ? { statusCode: 404 } : null
    if (state === 'empty') view.state.data.value = null
    await nextTick()
    assert.equal(sectionWidgets(view).length, 0, state)
    assert.equal(sectionTabs(view).length, 0, state)
    assert.doesNotMatch(view.text(), /Second ring|Lorem ipsum|There are no reviews yet/, state)

    view.state.pending.value = false
    view.state.error.value = null
    view.state.data.value = { id: 2, title: 'Second ring' }
    await nextTick()
    assert.equal(sectionTabs(view)[0].props['aria-selected'], true, state)
    sectionTabs(view)[1].props.onClick()
    await nextTick()
    assert.equal(sectionTabs(view)[1].props['aria-selected'], true, state)
  }
})
test('product page passes four repeated images, keeps them stable and remounts gallery for a new ID', async (t) => {
  const view = await mount(t, {
    data: ref({ id: 1, title: 'First ring', image: '/ring.jpg' }),
  })
  const gallery = () => view.all().find((el) => el.type === 'gallery')
  const productUrl = () => view.all().find((el) => el.type === 'h1').props['data-product-url']
  assert.equal(productUrl(), 'https://shoppe.test/products/1')
  const firstGallery = gallery()
  const firstImages = firstGallery.props.images
  assert.deepEqual(firstImages, Array(4).fill('/ring.jpg'))

  view.state.data.value.title = 'Renamed ring'
  await nextTick()
  assert.equal(gallery(), firstGallery)
  assert.equal(gallery().props.images, firstImages)
  assert.equal(gallery().props.title, 'Renamed ring')

  globalThis.loadingTest.route.params.id = '2'
  view.state.data.value = { id: 2, title: 'Second ring', image: '/ring.jpg' }
  await nextTick()
  assert.equal(productUrl(), 'https://shoppe.test/products/2')
  assert.notEqual(gallery(), firstGallery)
  assert.deepEqual(gallery().props.images, Array(4).fill('/ring.jpg'))

  view.state.data.value = { id: 3, title: 'Ring without image' }
  await nextTick()
  assert.equal(productUrl(), 'https://shoppe.test/products/3')
  assert.deepEqual(gallery().props.images, [])
})
test('visible retry button recovers after a real fixture server error', async (t) => {
  const server = createProductApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())
  const url = `http://127.0.0.1:${server.address().port}/retry/products/1`
  const response = await fetch(url)
  assert.equal(response.status, 503)
  let view
  const refresh = async () => {
    view.state.pending.value = true
    const response = await fetch(url)
    assert.equal(response.status, 200)
    view.state.data.value = await response.json()
    view.state.error.value = null
    view.state.pending.value = false
  }
  view = await mount(t, { error: ref({ statusCode: response.status }), refresh })
  assert.match(view.text(), /Unable to load product/)
  assert.equal(sectionWidgets(view).length, 0)
  await view
    .all()
    .find((el) => el.type === 'button')
    .props.onClick()
  await nextTick()
  assert.match(view.text(), /Fixture gold ring/)
  assert.doesNotMatch(view.text(), /Unable to load product/)
})
test('missing product preserves the catalog link for 404 and empty data', async (t) => {
  const view = await mount(t, { error: ref({ statusCode: 404 }) })
  assert.match(view.text(), /Product not found/)
  assert.equal(sectionWidgets(view).length, 0)
  assert.equal(view.all().find((el) => el.type === 'a').props.href, '/products')
  assert.doesNotMatch(view.text(), /Try again/)
  view.state.error.value = null
  await nextTick()
  assert.match(view.text(), /Product not found/)
})
