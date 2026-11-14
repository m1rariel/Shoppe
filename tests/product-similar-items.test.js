import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { computed, ref, watch, nextTick, h, Suspense, reactive } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      '#app':
        'export const useRoute=()=>globalThis.similarTest.route;export const useRequestURL=()=>new URL("https://shoppe.test/products/1");export const useRequestEvent=()=>undefined;export const setResponseStatus=()=>{}',
      '~/composables/api/products/useGetProduct':
        'export const useGetProduct=()=>globalThis.similarTest.main',
      '~/composables/useProductReviews':
        'import {ref} from "vue";export const useProductReviews=()=>({reviews:ref([]),author:ref({}),error:ref(null),authorError:ref(null),save(){},updateAuthor(){}})',
      '~/composables/api/useApiFetch':
        'export const useApiFetch=(request,options)=>globalThis.similarTest.fetch(request,options)',
      '~/stores/cartStore': 'export const useCartStore=()=>globalThis.similarTest.cart',
    }
    if (mocks[specifier])
      return { url: `data:text/javascript,${mocks[specifier]}`, shortCircuit: true }
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
const similar = await loadSfc(new URL('../components/ProductSimilarItems.vue', import.meta.url))
const item = (id, category = 'rings') => ({
  id,
  category,
  title: `Ring ${id}`,
  description: '',
  price: 20,
})
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}

async function setup(t, addItem = async () => true) {
  const calls = []
  const requests = []
  const states = new Map()
  globalThis.similarTest = {
    route: reactive({ params: { id: '1' } }),
    main: { data: ref(item(1)), pending: ref(false), error: ref(null), refresh() {} },
    cart: { addItem },
    fetch(request, options) {
      calls.push({ request, options })
      const key = computed(() => options.params.value.category)
      const state = () => {
        if (!states.has(key.value))
          states.set(key.value, {
            data: ref(),
            pending: ref(true),
            status: ref('pending'),
            error: ref(null),
          })
        return states.get(key.value)
      }
      const execute = () => {
        const target = state()
        target.pending.value = true
        target.status.value = 'pending'
        requests.push({
          category: key.value,
          resolve(data) {
            target.data.value = data
            target.error.value = null
            target.pending.value = false
            target.status.value = 'success'
          },
          reject() {
            target.error.value = new Error('Unavailable')
            target.pending.value = false
            target.status.value = 'error'
          },
        })
      }
      watch(key, execute, { immediate: true, flush: 'sync' })
      return {
        data: computed(() => state().data.value),
        pending: computed(() => state().pending.value),
        status: computed(() => state().status.value),
        error: computed(() => state().error.value),
        refresh: execute,
      }
    },
  }
  const view = mountComponent(
    t,
    { render: () => h(Suspense, null, { default: () => h(page) }) },
    {
      components: {
        ProductInfo: { props: ['product'], setup: (p) => () => h('h1', p.product.title) },
        ProductGallery: { render: () => null },
        ProductReviews: { render: () => null },
        NuxtLink: { render: () => null },
        ProductSections: { render: () => null },
        ProductSimilarItems: similar,
        ProductCardList: {
          props: ['products', 'pendingIds'],
          emits: ['addToCart'],
          setup:
            (p, { emit }) =>
            () =>
              h(
                'div',
                p.products.map((product) =>
                  h('a', { href: `/products/${product.id}` }, [
                    product.title,
                    h(
                      'button',
                      {
                        disabled: p.pendingIds.includes(product.id),
                        onClick: () => emit('addToCart', product),
                      },
                      'ADD TO CART',
                    ),
                  ]),
                ),
              ),
        },
        BaseButton: {
          setup:
            (_, { attrs, slots }) =>
            () =>
              h('button', attrs, slots.default?.()),
        },
      },
    },
  )
  await settle()
  t.after(() => {
    view.unmount()
    delete globalThis.similarTest
  })
  return { ...view, calls, requests, main: globalThis.similarTest.main }
}
const links = (view) => view.all((n) => n.type === 'a').map((n) => n.props.href)
test('main product remains visible during auxiliary loading; client-only category request filters current before limiting', async (t) => {
  const view = await setup(t)
  assert.match(view.text(), /Ring 1/)
  assert.match(view.text(), /Loading similar items/)
  assert.equal(view.calls[0].request, '/products')
  assert.equal(view.calls[0].options.server, false)
  assert.deepEqual(view.calls[0].options.params.value, { category: 'rings', limit: undefined })
  view.requests[0].resolve([item(1), item(7), item(2, 'other'), item(4), item(8), item(9)])
  await nextTick()
  assert.deepEqual(links(view), ['/products/7', '/products/4', '/products/8'])
})
test('incomplete results stay visible, empty and current-only results hide the block', async (t) => {
  const view = await setup(t)
  for (const [data, expected] of [
    [[item(1), item(2)], ['/products/2']],
    [[], []],
    [[item(1)], []],
  ]) {
    view.requests[0].resolve(data)
    await nextTick()
    assert.deepEqual(links(view), expected)
    assert.equal(/Similar Items/.test(view.text()), expected.length > 0)
  }
})
test('auxiliary failure and retry stay local to the rendered product', async (t) => {
  const view = await setup(t)
  view.requests[0].reject()
  await nextTick()
  assert.match(view.text(), /Ring 1/)
  assert.match(view.text(), /Unable to load similar/)
  view.find((n) => n.type === 'button').props.onClick()
  await nextTick()
  assert.match(view.text(), /Loading similar/)
  view.requests[1].resolve([item(3)])
  await nextTick()
  assert.deepEqual(links(view), ['/products/3'])
})
test('category changes hide old rows and late responses cannot replace current results; same-category ID changes exclude new current', async (t) => {
  const view = await setup(t)
  const old = view.requests[0]
  view.main.data.value = item(20, 'earrings')
  await nextTick()
  assert.deepEqual(links(view), [])
  assert.match(view.text(), /Loading similar/)
  assert.equal(view.requests[1].category, 'earrings')
  view.requests[1].resolve([item(20, 'earrings'), item(21, 'earrings'), item(22, 'earrings')])
  await nextTick()
  old.resolve([item(2), item(3)])
  await nextTick()
  assert.deepEqual(links(view), ['/products/21', '/products/22'])
  view.main.data.value = item(21, 'earrings')
  await nextTick()
  assert.deepEqual(links(view), ['/products/20', '/products/22'])
})
test('add delegates to shared cart once while pending and allows another add after settlement', async (t) => {
  const calls = []
  let finish
  const view = await setup(t, (product) => {
    calls.push(product.id)
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  view.requests[0].resolve([item(2)])
  await nextTick()
  const button = () => view.find((n) => n.type === 'button')
  button().props.onClick()
  button().props.onClick()
  await nextTick()
  assert.deepEqual(calls, [2])
  assert.equal(button().props.disabled, true)
  finish(true)
  await settle()
  assert.equal(button().props.disabled, false)
  button().props.onClick()
  assert.deepEqual(calls, [2, 2])
  finish(false)
  await settle()
})
