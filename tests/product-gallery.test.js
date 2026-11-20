import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { setupZoom as mountZoom, hasClass } from './helpers/image-viewer-runtime.js'

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
    if (specifier === '~/composables/useImageZoom')
      return {
        url: new URL('../composables/useImageZoom.ts', import.meta.url).href,
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
const viewer = await loadSfc(new URL('../components/ProductImageViewer.vue', import.meta.url))
const gallery = await loadSfc(new URL('../components/ProductGallery.vue', import.meta.url))
const setupZoom = (t, images) => mountZoom(t, gallery, images, viewer)
async function setup(t, component, initial) {
  globalThis.detailTest = { sliders: [] }
  const view = mountComponent(t, component, {
    props: initial,
    components: {
      ProductImageViewer: viewer,
    },
  })
  await nextTick()
  t.after(() => {
    view.unmount()
    delete globalThis.detailTest
  })
  return view
}
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

async function setupCompletedImages(t, images) {
  globalThis.detailTest = { sliders: [] }
  const view = mountComponent(t, gallery, {
    props: { images, productTitle: 'Ring' },
    components: { ProductImageViewer: viewer },
    decorateNode(node) {
      if (node.type !== 'img') return
      Object.defineProperties(node, {
        complete: { get: () => node.props.src !== '/loading.jpg' },
        naturalWidth: { get: () => (node.props.src === '/loaded.jpg' ? 400 : 0) },
      })
    },
  })
  await nextTick()
  t.after(() => {
    view.unmount()
    delete globalThis.detailTest
  })
  return view
}

test('gallery recovers an image error completed before hydration across repeated desktop and mobile images', async (t) => {
  const view = await setupCompletedImages(t, Array(4).fill('/cached-broken.jpg'))
  assert.equal(view.all((node) => node.type === 'img').length, 0)
  assert.equal(view.all((node) => node.props['aria-haspopup'] === 'dialog').length, 0)
  assert.equal(view.all(hasClass('product-gallery__fallback')).length, 5)
})

test('gallery checks cached replacement images without rejecting loading or successfully loaded images', async (t) => {
  const view = await setupCompletedImages(t, ['/loading.jpg'])
  assert.equal(view.all((node) => node.type === 'img').length, 2)
  view.props.images = ['/loaded.jpg']
  await nextTick()
  await nextTick()
  assert.equal(view.all((node) => node.type === 'img').length, 2)
  view.props.images = Array(4).fill('/cached-broken.jpg')
  await nextTick()
  await nextTick()
  assert.equal(view.all((node) => node.type === 'img').length, 0)
  assert.equal(view.all((node) => node.props['aria-haspopup'] === 'dialog').length, 0)
})

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
  globalThis.window.innerWidth = 1440
  view.open(1, view.all(hasClass('product-gallery__mobile-opener'))[0])
  assert.ok(!view.dialog().open)
  view.open(1)
  await nextTick()
  assert.equal(view.dialog().open, true)
})

test('gallery renders an empty native viewer safely during SSR', async () => {
  const app = createSSRApp({
    render: () => h(gallery, { images: ['/a.jpg'], productTitle: 'Ring' }),
  })
  app.component('ProductImageViewer', viewer)
  const html = await renderToString(app)
  assert.match(html, /aria-label="Enlarged product image"/)
  assert.match(html, /aria-haspopup="dialog"/)
  assert.doesNotMatch(html, /<dialog[^>]* open/)
})
