import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick } from 'vue'

import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('.svg'))
      return { url: 'data:text/javascript,export default {render:()=>null}', shortCircuit: true }
    if (specifier === '~/stores/cartStore')
      return {
        url: 'data:text/javascript,export const useCartStore=()=>globalThis.detailTest.cart',
        shortCircuit: true,
      }
    if (specifier === '~/composables/useNotification')
      return {
        url: 'data:text/javascript,export const NotificationTypes={}; export const useNotification=()=>({showNotification:async()=>{}})',
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
const share = await loadSfc(new URL('../components/ProductShare.vue', import.meta.url))
const info = await loadSfc(new URL('../components/ProductInfo.vue', import.meta.url))
async function setup(t, component, initial, addItem = async () => true) {
  globalThis.detailTest = { cart: { addItem } }
  const view = mountComponent(t, component, {
    props: { productUrl: 'https://shoppe.test/products/1', ...initial },
    components: {
      ProductShare: share,
      BaseButton: {
        setup:
          (props, { attrs, slots }) =>
          () =>
            h('button', attrs, slots.default?.()),
      },
    },
  })
  await nextTick()
  t.after(() => {
    view.unmount()
    delete globalThis.detailTest
  })
  return view
}
const product = {
  id: 1,
  title: 'Ring',
  price: 20,
  image: '/ring.jpg',
  description: 'A ring',
  category: 'jewelry',
}
const hasClass = (name) => (n) => String(n.props.class).split(' ').includes(name)
test('product details render the real SKU and category and follow product changes', async (t) => {
  const view = await setup(t, info, { product: { ...product } })
  const details = () => view.find(hasClass('product-info__details'))
  const rows = () => details().children.filter((n) => n.type === 'p')
  assert.deepEqual(
    rows().map((row) => row.children.map((n) => n.text)),
    [
      ['SKU:', '1'],
      ['Categories:', 'jewelry'],
    ],
  )
  const category = 'ОченьДлиннаяКатегорияБезПробелов'.repeat(8)
  view.props.product = { ...product, id: 29, category }
  await nextTick()
  assert.deepEqual(
    rows().map((row) => row.children.map((n) => n.text)),
    [
      ['SKU:', '29'],
      ['Categories:', category],
    ],
  )
})
test('rating presents one accessible score and five proportionally filled decorative stars', async (t) => {
  const view = await setup(t, info, { product: { ...product, rating: { rate: 4.5, count: 12 } } })
  const rating = view.find(hasClass('product-info__rating'))
  assert.equal(rating.props.role, 'img')
  assert.equal(rating.props['aria-label'], '4.5 out of 5')
  assert.equal(rating.children[0].text, '4.5')
  assert.equal(rating.children[0].props['aria-hidden'], 'true')
  assert.equal(view.find(hasClass('product-info__stars')).props['aria-hidden'], 'true')
  assert.equal(view.all(hasClass('product-info__star')).length, 5)
  assert.deepEqual(
    view.all(hasClass('product-info__star-fill')).map((n) => n.props.style.width),
    ['100%', '100%', '100%', '100%', '50%'],
  )
  view.props.product.rating = { rate: 2.25 }
  await nextTick()
  assert.equal(rating.props['aria-label'], '2.25 out of 5')
  assert.deepEqual(
    view.all(hasClass('product-info__star-fill')).map((n) => n.props.style.width),
    ['100%', '100%', '25%', '0%', '0%'],
  )
})
test('missing, empty and malformed ratings show No ratings without invented scores or stars', async (t) => {
  const view = await setup(t, info, { product: { ...product } })
  for (const rating of [
    undefined,
    null,
    4.5,
    [],
    {},
    { rate: '4.5' },
    { rate: NaN },
    { rate: Infinity },
    { rate: -0.1 },
    { rate: 5.1 },
    { rate: 4.5, count: 0 },
    { rate: 4.5, count: -1 },
    { rate: 4.5, count: 1.5 },
    { rate: 4.5, count: Number.MAX_SAFE_INTEGER + 1 },
    { rate: 4.5, count: '12' },
    { rate: 4.5, count: null },
    { rate: 4.5, count: undefined },
  ]) {
    view.props.product = { ...product, rating }
    await nextTick()
    const summary = view.find(hasClass('product-info__rating'))
    assert.equal(summary.text, 'No ratings', JSON.stringify(rating))
    assert.equal(summary.props['aria-label'], undefined)
    assert.equal(view.all(hasClass('product-info__star')).length, 0)
  }
})
test('rating accepts both score boundaries and reacts when product props change', async (t) => {
  const view = await setup(t, info, { product: { ...product, rating: { rate: 0, count: 1 } } })
  assert.equal(view.find(hasClass('product-info__rating')).props['aria-label'], '0 out of 5')
  assert.ok(
    view.all(hasClass('product-info__star-fill')).every((n) => n.props.style.width === '0%'),
  )
  view.props.product = { ...product, id: 2, rating: { rate: 5 } }
  await nextTick()
  assert.equal(view.find(hasClass('product-info__rating')).props['aria-label'], '5 out of 5')
  assert.ok(
    view.all(hasClass('product-info__star-fill')).every((n) => n.props.style.width === '100%'),
  )
  view.props.product = { ...product, id: 3 }
  await nextTick()
  assert.equal(view.find(hasClass('product-info__rating')).text, 'No ratings')
})
test('quantity stays positive and pending add prevents duplicate submission', async (t) => {
  const calls = []
  let finish
  const view = await setup(t, info, { product }, (p, q) => {
    calls.push([p.id, q])
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const decrease = () => view.find((n) => n.props['aria-label'] === 'Decrease quantity')
  const increase = () => view.find((n) => n.props['aria-label'] === 'Increase quantity')
  const selectedQuantity = () =>
    view.find(hasClass('product-info__quantity')).children.find((n) => n.type === 'span').text
  assert.equal(decrease().props.disabled, true)
  decrease().props.onClick()
  await nextTick()
  assert.equal(selectedQuantity(), '1')
  increase().props.onClick()
  increase().props.onClick()
  await nextTick()
  assert.equal(selectedQuantity(), '3')
  const add = view.find((n) => String(n.props.class).includes('product-info__add-to-cart'))
  const request = add.props.onClick()
  await nextTick()
  await add.props.onClick()
  assert.deepEqual(calls, [[1, 3]])
  assert.equal(add.props.disabled, true)
  assert.equal(decrease().props.disabled, true)
  assert.equal(increase().props.disabled, true)
  finish(true)
  await request
  await nextTick()
  assert.equal(add.props.disabled, false)
  decrease().props.onClick()
  decrease().props.onClick()
  await nextTick()
  assert.equal(decrease().props.disabled, true)
})
test('changing product ID resets quantity before adding the newly selected product', async (t) => {
  const calls = []
  const view = await setup(t, info, { product: { ...product } }, async (p, q) => {
    calls.push([p.id, q])
  })
  const quantity = () =>
    view.find(hasClass('product-info__quantity')).children.find((n) => n.type === 'span').text
  view.find((n) => n.props['aria-label'] === 'Increase quantity').props.onClick()
  await nextTick()
  view.props.product = { ...product, title: 'Updated ring' }
  await nextTick()
  assert.equal(quantity(), '2')
  view.props.product = { ...product, id: 2 }
  await nextTick()
  assert.equal(quantity(), '1')
  assert.equal(view.find((n) => n.props['aria-label'] === 'Decrease quantity').props.disabled, true)
  await view.find(hasClass('product-info__add-to-cart')).props.onClick()
  assert.deepEqual(calls, [[2, 1]])
})
