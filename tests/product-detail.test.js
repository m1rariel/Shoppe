import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick } from 'vue'

import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.endsWith('.svg') ||
      specifier.endsWith('/css') ||
      specifier.endsWith('/pagination')
    )
      return { url: 'data:text/javascript,export default {render:()=>null}', shortCircuit: true }
    if (specifier === 'swiper/modules')
      return { url: 'data:text/javascript,export const Pagination = {}', shortCircuit: true }
    if (specifier === 'swiper')
      return {
        url: 'data:text/javascript,export default class Swiper { constructor(el, options) { this.options=options; this.activeIndex=0; globalThis.detailTest.sliders.push(this) } slideTo(index) { this.activeIndex=index; this.options.on.slideChange(this) } destroy() { this.destroyed=true } }',
        shortCircuit: true,
      }
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
const [info, gallery] = await Promise.all(
  ['ProductInfo', 'ProductGallery'].map((name) =>
    loadSfc(new URL(`../components/${name}.vue`, import.meta.url)),
  ),
)
async function setup(t, component, initial, addItem = async () => true) {
  globalThis.detailTest = { sliders: [], cart: { addItem } }
  const view = mountComponent(t, component, {
    props:
      component === info ? { productUrl: 'https://shoppe.test/products/1', ...initial } : initial,
    components: {
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
test('single real image creates no duplicate thumbnails or slider', async (t) => {
  const view = await setup(t, gallery, { images: ['/ring.jpg'], productTitle: 'Ring' })
  assert.equal(view.all(hasClass('product-gallery__miniature')).length, 0)
  assert.equal(globalThis.detailTest.sliders.length, 0)
  assert.ok(view.find((n) => n.type === 'img' && n.props.alt === 'Ring'))
})
test('gallery selection synchronizes images and destroys its own slider', async (t) => {
  const view = await setup(t, gallery, { images: ['/a.jpg', '/b.jpg'], productTitle: 'Ring' })
  const slider = globalThis.detailTest.sliders[0]
  view.find((n) => n.props['aria-label'] === 'View image 2 of 2').props.onClick()
  await nextTick()
  assert.equal(slider.activeIndex, 1)
  assert.equal(view.find((n) => n.type === 'img' && n.props.alt === 'Ring').props.src, '/b.jpg')
  view.props.images = ['/new.jpg']
  await nextTick()
  await nextTick()
  assert.equal(slider.destroyed, true)
  assert.equal(view.find((n) => n.type === 'img' && n.props.alt === 'Ring').props.src, '/new.jpg')
  view.props.images = ['/a.jpg', '/b.jpg']
  await nextTick()
  await nextTick()
  const replacement = globalThis.detailTest.sliders.at(-1)
  view.unmount()
  assert.equal(replacement.destroyed, true)
})
test('four repeated gallery images select independently, follow swipes and reset with new images', async (t) => {
  const view = await setup(t, gallery, {
    images: Array(4).fill('/ring.jpg'),
    productTitle: 'Ring',
  })
  const thumbnails = () => view.all(hasClass('product-gallery__miniature'))
  const active = () => thumbnails().map((n) => n.props['aria-pressed'])
  const progress = () => view.find(hasClass('product-gallery__progress-active')).props.style
  const slider = globalThis.detailTest.sliders[0]
  assert.equal(thumbnails().length, 4)
  assert.equal(view.all(hasClass('swiper-slide')).length, 4)
  assert.deepEqual(active(), [true, false, false, false])
  for (let index = 1; index < 4; index++) {
    thumbnails()[index].props.onClick()
    await nextTick()
    assert.equal(slider.activeIndex, index)
    assert.deepEqual(
      active(),
      [0, 1, 2, 3].map((i) => i === index),
    )
    assert.equal(progress().transform, `translateX(${index * 100}%)`)
  }

  slider.activeIndex = 1
  slider.options.on.slideChange(slider)
  await nextTick()
  assert.deepEqual(active(), [false, true, false, false])
  assert.equal(progress().transform, 'translateX(100%)')

  view.find(hasClass('product-gallery__active-image')).props.onError()
  await nextTick()
  assert.equal(view.all((n) => n.type === 'img').length, 0)
  assert.equal(view.all(hasClass('product-gallery__fallback')).length, 5)

  view.props.images = Array(4).fill('/ring.jpg')
  await nextTick()
  await nextTick()
  assert.equal(slider.destroyed, true)
  assert.deepEqual(active(), [true, false, false, false])
  assert.equal(progress().transform, 'translateX(0%)')
  assert.equal(view.all((n) => n.type === 'img').length, 9)
  const replacement = globalThis.detailTest.sliders.at(-1)
  view.unmount()
  assert.equal(replacement.destroyed, true)
})
test('empty gallery shows fallback without thumbnails or slider', async (t) => {
  const view = await setup(t, gallery, { images: [], productTitle: 'Ring' })
  assert.equal(view.all((n) => n.type === 'img' || n.props['aria-haspopup'] === 'dialog').length, 0)
  assert.equal(globalThis.detailTest.sliders.length, 0)
  assert.equal(view.all(hasClass('product-gallery__fallback')).length, 2)
})
test('failed gallery image displays a fallback', async (t) => {
  const view = await setup(t, gallery, { images: ['/broken.jpg'], productTitle: 'Ring' })
  view.find((n) => n.type === 'img').props.onError()
  await nextTick()
  assert.equal(view.all((n) => n.type === 'img').length, 0)
  assert.ok(view.find((n) => n.text === 'Image unavailable'))
})

async function setupZoom(t, images = ['/a.jpg', '/b.jpg']) {
  globalThis.detailTest = { sliders: [] }
  const previousDocument = globalThis.document
  const previousWindow = globalThis.window
  const browser = { body: { style: { overflow: 'auto' } }, activeElement: null }
  globalThis.document = browser
  globalThis.window = { matchMedia: () => ({ matches: true }) }
  const view = mountComponent(t, gallery, {
    props: { images, productTitle: 'Ring' },
    decorateNode(node) {
      node.isConnected = true
      node.focus = () => {
        browser.activeElement = node
      }
      node.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 300 })
      if (node.type === 'div') {
        node.scrollLeft = 0
        node.scrollTop = 0
        node.clientWidth = 400
        node.clientHeight = 300
        const canvasScale = () =>
          Number.parseFloat(node.children[0]?.props.style.width || '100') / 100
        Object.defineProperties(node, {
          scrollWidth: { get: () => 400 * canvasScale() },
          scrollHeight: { get: () => 300 * canvasScale() },
        })
        const captures = new Set()
        node.setPointerCapture = (id) => captures.add(id)
        node.hasPointerCapture = (id) => captures.has(id)
        node.releasePointerCapture = (id) => {
          captures.delete(id)
          node.props.onLostpointercapture({ pointerId: id })
        }
      }
      if (node.type === 'dialog') {
        node.showModal = () => {
          node.open = true
          node.modalCalls = (node.modalCalls || 0) + 1
        }
        node.close = () => {
          node.open = false
        }
      }
    },
  })
  await nextTick()
  t.after(() => {
    view.unmount()
    globalThis.document = previousDocument
    globalThis.window = previousWindow
    delete globalThis.detailTest
  })
  const stage = () => view.find(hasClass('product-gallery__stage'))
  const dialog = () => view.find((n) => n.type === 'dialog')
  const control = (label) => view.find((n) => n.props['aria-label'] === label)
  const open = (detail = 0, target = stage()) =>
    target.props.onClick({ detail, currentTarget: target })
  return { ...view, stage, dialog, control, open, browser }
}

test('desktop hover doubles the image around clamped cursor coordinates and resets on leave or image change', async (t) => {
  const view = await setupZoom(t)
  const image = () => view.find(hasClass('product-gallery__active-image'))
  const move = (x, y, pointerType = 'mouse') =>
    view
      .stage()
      .props.onPointermove({ currentTarget: view.stage(), clientX: x, clientY: y, pointerType })
  move(200, 200)
  await nextTick()
  assert.deepEqual(image().props.style, { transform: 'scale(2)', transformOrigin: '25% 50%' })
  move(-10, 900)
  await nextTick()
  assert.equal(image().props.style.transformOrigin, '0% 100%')
  view.stage().props.onPointerleave()
  await nextTick()
  assert.equal(image().props.style.transform, 'scale(1)')
  move(200, 200, 'touch')
  await nextTick()
  assert.equal(image().props.style.transform, 'scale(1)')
  globalThis.window.matchMedia = () => ({ matches: false })
  move(200, 200)
  await nextTick()
  assert.equal(image().props.style.transform, 'scale(1)')
  globalThis.window.matchMedia = () => ({ matches: true })
  move(200, 200)
  view.find((n) => n.props['aria-label'] === 'View image 2 of 2').props.onClick()
  await nextTick()
  assert.equal(image().props.style.transform, 'scale(1)')
})

test('native image button opens a modal, scale clamps to 100–400%, reset and Escape restore focus and scroll', async (t) => {
  const view = await setupZoom(t)
  assert.equal(view.stage().type, 'button')
  assert.equal(view.stage().props['aria-haspopup'], 'dialog')
  view.open()
  await nextTick()
  assert.equal(view.dialog().open, true)
  assert.equal(view.dialog().modalCalls, 1)
  assert.equal(view.browser.body.style.overflow, 'hidden')
  assert.equal(view.control('Zoom out').props.disabled, true)
  for (let i = 0; i < 10; i++) view.control('Zoom in').props.onClick()
  await nextTick()
  assert.equal(view.control('Image scale').text, '400%')
  assert.equal(view.control('Zoom in').props.disabled, true)
  assert.deepEqual(view.find(hasClass('product-gallery__viewer-canvas')).props.style, {
    width: '400%',
    height: '400%',
  })
  view.find((n) => n.type === 'button' && n.text === 'Reset zoom').props.onClick()
  await nextTick()
  assert.equal(view.control('Image scale').text, '100%')
  for (let i = 0; i < 10; i++) view.control('Zoom out').props.onClick()
  await nextTick()
  assert.equal(view.control('Image scale').text, '100%')
  view.dialog().props.onCancel({ preventDefault() {} })
  await nextTick()
  assert.equal(view.dialog().open, false)
  assert.equal(view.browser.activeElement, view.stage())
  assert.equal(view.browser.body.style.overflow, 'auto')
  view.open()
  await nextTick()
  assert.equal(view.dialog().modalCalls, 2)
  assert.equal(view.control('Image scale').text, '100%')
  view.control('Close image viewer').props.onClick()
  assert.equal(view.browser.body.style.overflow, 'auto')
})

test('viewer closes and cleans up for failed images, mutated images and unmount without focusing a disconnected opener', async (t) => {
  const view = await setupZoom(t)
  view.open()
  await nextTick()
  view.find(hasClass('product-gallery__viewer-canvas')).children[0].props.onError()
  await nextTick()
  assert.equal(view.dialog().open, false)
  assert.equal(view.stage(), undefined)
  assert.equal(view.browser.body.style.overflow, 'auto')
  view.props.images = ['/new.jpg']
  await nextTick()
  await nextTick()
  view.open()
  view.control('Zoom in').props.onClick()
  view.props.images[0] = '/changed.jpg'
  await nextTick()
  await nextTick()
  assert.equal(view.dialog().open, false)
  assert.equal(view.control('Image scale').text, '100%')
  assert.equal(view.browser.body.style.overflow, 'auto')
  view.open()
  view.stage().isConnected = false
  view.browser.activeElement = null
  view.unmount()
  assert.equal(view.browser.body.style.overflow, 'auto')
  assert.equal(view.browser.activeElement, null)
})

test('mobile image buttons preserve swipe selection, hide inactive controls from Tab and suppress clicks after drags', async (t) => {
  const view = await setupZoom(t)
  const slider = globalThis.detailTest.sliders[0]
  const mobile = () => view.all(hasClass('product-gallery__mobile-opener'))
  assert.deepEqual(
    mobile().map((n) => n.props.tabindex),
    [0, -1],
  )
  slider.activeIndex = 1
  slider.options.on.slideChange(slider)
  await nextTick()
  assert.deepEqual(
    mobile().map((n) => n.props.tabindex),
    [-1, 0],
  )
  slider.allowClick = false
  view.open(1, mobile()[1])
  assert.ok(!view.dialog().open)
  slider.allowClick = true
  const surface = view.find(hasClass('product-gallery__slider'))
  surface.props.onPointerdownCapture({ clientX: 200, clientY: 200 })
  surface.props.onPointerupCapture({ clientX: 80, clientY: 200 })
  view.open(1, mobile()[1])
  assert.ok(!view.dialog().open)
  surface.props.onPointerdownCapture({ clientX: 200, clientY: 200 })
  surface.props.onPointerupCapture({ clientX: 202, clientY: 200 })
  view.open(1, mobile()[1])
  await nextTick()
  assert.equal(view.dialog().open, true)
  assert.equal(
    view.find(hasClass('product-gallery__viewer-canvas')).children[0].props.src,
    '/b.jpg',
  )
  view.control('Close image viewer').props.onClick()
  view.open(0, mobile()[1])
  assert.equal(view.dialog().open, true)
})

test('a mobile drag cannot block the desktop image after changing viewport', async (t) => {
  const view = await setupZoom(t)
  const surface = view.find(hasClass('product-gallery__slider'))
  surface.props.onPointerdownCapture({ clientX: 200, clientY: 200 })
  surface.props.onPointerupCapture({ clientX: 80, clientY: 200 })
  globalThis.detailTest.sliders[0].allowClick = false
  view.open(1)
  await nextTick()
  assert.equal(view.dialog().open, true)
})

async function setupGestures(t) {
  const view = await setupZoom(t)
  const viewport = view.find(hasClass('product-gallery__viewer-scroll'))
  const send = (type, id, x = 200, y = 150, pointerType = 'touch') => {
    let prevented = false
    viewport.props[type]({
      pointerId: id,
      clientX: x,
      clientY: y,
      pointerType,
      preventDefault() {
        prevented = true
      },
    })
    return prevented
  }
  view.open()
  await nextTick()
  return { ...view, viewport, send, percent: () => view.control('Image scale').text }
}

test('viewer pinch anchors its focal point, clamps scale and pans within bounds across two-to-one transitions', async (t) => {
  const v = await setupGestures(t)
  v.send('onPointerdown', 1, 200, 150)
  v.send('onPointerdown', 2, 400, 150)
  v.send('onPointermove', 2, 600, 150)
  await nextTick()
  assert.equal(v.percent(), '200%')
  assert.equal(v.viewport.scrollLeft, 100)
  assert.equal(v.viewport.scrollTop, 100)
  v.send('onPointerup', 2)
  v.send('onPointermove', 1, 200, 150)
  await nextTick()
  assert.equal(v.viewport.scrollLeft, 100)
  v.send('onPointermove', 1, -2000, -2000)
  await nextTick()
  assert.equal(v.viewport.scrollLeft, 400)
  assert.equal(v.viewport.scrollTop, 300)
  v.send('onPointermove', 1, 3000, 3000)
  await nextTick()
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.viewport.scrollTop, 0)
  v.send('onPointerdown', 2, 3100, 3000)
  v.send('onPointermove', 2, 5000, 3000)
  await nextTick()
  assert.equal(v.percent(), '400%')
  v.send('onPointermove', 2, 3001, 3000)
  await nextTick()
  assert.equal(v.percent(), '100%')
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.viewport.scrollTop, 0)
})

test('cancel, lost capture, toolbar reset and close discard gestures and stale scroll work', async (t) => {
  const v = await setupGestures(t)
  const pinch = () => {
    v.send('onPointerdown', 1, 200, 150)
    v.send('onPointerdown', 2, 400, 150)
    v.send('onPointermove', 2, 600, 150)
  }
  pinch()
  v.send('onPointercancel', 2)
  v.send('onLostpointercapture', 1)
  assert.equal(v.send('onPointermove', 1, 0, 0), false)
  await nextTick()
  assert.equal(v.percent(), '200%')
  pinch()
  v.find((n) => n.type === 'button' && n.text === 'Reset zoom').props.onClick()
  await nextTick()
  assert.equal(v.percent(), '100%')
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.send('onPointermove', 2, 900, 900), false)
  pinch()
  v.control('Close image viewer').props.onClick()
  v.open()
  await nextTick()
  assert.equal(v.percent(), '100%')
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.viewport.scrollTop, 0)
  assert.equal(v.send('onPointerdown', 3, 200, 150, 'mouse'), false)
  pinch()
  v.props.images = ['/replacement.jpg']
  await nextTick()
  await nextTick()
  assert.equal(v.dialog().open, false)
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.browser.body.style.overflow, 'auto')
  v.open()
  pinch()
  v.unmount()
  await nextTick()
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.browser.body.style.overflow, 'auto')
})

test('toolbar zoom interrupts a pending pinch and subsequent touch starts from the displayed position', async (t) => {
  const v = await setupGestures(t)
  v.send('onPointerdown', 1, 200, 150)
  v.send('onPointermove', 1, 0, 0)
  await nextTick()
  assert.equal(v.viewport.scrollLeft, 0)
  v.send('onPointerdown', 2, 200, 0)
  v.send('onPointermove', 2, 400, 0)
  v.control('Zoom in').props.onClick()
  await nextTick()
  assert.equal(v.percent(), '250%')
  assert.equal(v.send('onPointermove', 1, 300, 300), false)
  const before = v.viewport.scrollLeft
  v.send('onPointerdown', 1, 200, 150)
  v.send('onPointermove', 1, 180, 150)
  v.send('onPointerdown', 2, 400, 150)
  v.send('onPointermove', 2, 400, 150)
  await nextTick()
  assert.equal(v.viewport.scrollLeft, before + 20)
  v.control('Zoom out').props.onClick()
  await nextTick()
  assert.equal(v.percent(), '200%')
  assert.equal(v.send('onPointermove', 2, 800, 800), false)
})
