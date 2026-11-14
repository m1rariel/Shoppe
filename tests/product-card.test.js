import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick } from 'vue'

import { loadSfc, mountComponent, observeTree } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '#app')
      return {
        url: 'data:text/javascript,export const useRouter = () => globalThis.productCardTest.router',
        shortCircuit: true,
      }
    if (specifier === '#imports')
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

const productCard = await loadSfc(new URL('../components/ProductCard.vue', import.meta.url))

const product = { id: 7, title: 'Ring', price: 20, category: 'jewelry' }
async function setup(t, width, productData = product) {
  globalThis.window = { innerWidth: width, addEventListener() {}, removeEventListener() {} }
  const navigations = []
  const added = []
  globalThis.productCardTest = { router: { push: (path) => navigations.push(path) } }
  const view = mountComponent(t, productCard, {
    props: {
      product: productData,
      onAddToCart: (item) => added.push(item),
    },
    components: {
      NuxtLink: {
        props: ['to'],
        setup(props, { attrs, slots }) {
          return () => h('a', { ...attrs, href: props.to }, slots.default?.())
        },
      },
      BaseButton: {
        setup(props, { attrs, slots }) {
          return () => h('button', attrs, slots.default?.())
        },
      },
    },
  })
  await nextTick()
  t.after(() => {
    view.unmount()
    delete globalThis.window
    delete globalThis.productCardTest
  })
  const card = view.root.children[0]
  const button = card.children[0].children.find((child) => child.type === 'button')
  return { card, button, navigations, added }
}

const find = (element, predicate) => observeTree(element).find(predicate)

test('product title is a real link exposing the full title', async (t) => {
  const { card } = await setup(t, 390)
  const link = find(card, (element) => element.type === 'a')
  assert.equal(link.props.href, '/products/7')
  assert.equal(link.props.title, 'Ring')
})

test('missing image keeps a readable fallback', async (t) => {
  const missing = await setup(t, 390)
  assert.ok(find(missing.card, (element) => element.text === 'Image unavailable'))
})

test('failed image switches to a readable fallback', async (t) => {
  const loaded = await setup(t, 1440, { ...product, image: '/test-product.jpg' })
  const image = find(loaded.card, (element) => element.type === 'img')
  assert.equal(image.props.alt, 'Ring')
  image.props.onError()
  await nextTick()
  assert.ok(find(loaded.card, (element) => element.text === 'Image unavailable'))
  assert.equal(
    find(loaded.card, (element) => element.type === 'img'),
    undefined,
  )
})

test('desktop product card opens its product on the first click', async (t) => {
  const { card, navigations } = await setup(t, 768)
  card.props.onClick()
  assert.deepEqual(navigations, ['/products/7'])
})

test('mobile product card opens its product on the first tap', async (t) => {
  const { card, navigations } = await setup(t, 767.99)
  card.props.onClick()
  assert.deepEqual(navigations, ['/products/7'])
})

for (const width of [390, 1440]) {
  test(`Add to cart at ${width}px emits its product and stops navigation`, async (t) => {
    const { button, navigations, added } = await setup(t, width)
    let stopped = false
    button.props.onClick({
      stopPropagation() {
        stopped = true
      },
    })
    assert.deepEqual(added, [product])
    assert.equal(stopped, true)
    assert.deepEqual(navigations, [])
  })
}
