import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick, ref } from 'vue'
import { setupZoom as mountZoom, hasClass } from './helpers/image-viewer-runtime.js'

import { loadSfc } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
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
const standaloneViewer = {
  props: ['images', 'productTitle'],
  setup(props) {
    const instance = ref(null)
    return () =>
      h('div', [
        h('button', {
          class: 'product-gallery__stage',
          'aria-haspopup': 'dialog',
          onClick: (event) => instance.value.open(props.images[0], event.currentTarget),
        }),
        h(viewer, { ref: instance, productTitle: props.productTitle }),
      ])
  },
}
const setupZoom = (t, images) => mountZoom(t, standaloneViewer, images)
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

test('toolbar zoom preserves the visible center across rapid clicks, scale bounds and reset', async (t) => {
  const view = await setupZoom(t)
  view.open()
  const viewport = view.find(hasClass('product-gallery__viewer-scroll'))
  view.control('Zoom in').props.onClick()
  await nextTick()
  assert.equal(viewport.scrollLeft, 100)
  assert.equal(viewport.scrollTop, 75)
  view.control('Zoom in').props.onClick()
  view.control('Zoom in').props.onClick()
  await nextTick()
  assert.equal(view.control('Image scale').text, '250%')
  assert.equal(viewport.scrollLeft, 300)
  assert.equal(viewport.scrollTop, 225)
  for (let index = 0; index < 8; index++) view.control('Zoom in').props.onClick()
  await nextTick()
  assert.equal(view.control('Image scale').text, '400%')
  assert.equal(viewport.scrollLeft, 600)
  assert.equal(viewport.scrollTop, 450)
  for (let index = 0; index < 8; index++) view.control('Zoom out').props.onClick()
  await nextTick()
  assert.equal(viewport.scrollLeft, 0)
  assert.equal(viewport.scrollTop, 0)
  view.control('Zoom in').props.onClick()
  view.find((node) => node.type === 'button' && node.text === 'Reset zoom').props.onClick()
  await nextTick()
  assert.equal(view.control('Image scale').text, '100%')
  assert.equal(viewport.scrollLeft, 0)
  assert.equal(viewport.scrollTop, 0)
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
  assert.equal(v.viewport.hasPointerCapture(1), false)
  assert.equal(v.viewport.hasPointerCapture(2), false)
  v.open()
  await nextTick()
  assert.equal(v.percent(), '100%')
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.viewport.scrollTop, 0)
  assert.equal(v.send('onPointerdown', 3, 200, 150, 'mouse'), false)
  pinch()
  v.unmount()
  await nextTick()
  assert.equal(v.viewport.scrollLeft, 0)
  assert.equal(v.viewport.hasPointerCapture(1), false)
  assert.equal(v.viewport.hasPointerCapture(2), false)
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
  assert.equal(v.viewport.scrollLeft, 50)
  assert.equal(v.viewport.scrollTop, 37.5)
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

test('toolbar zoom uses the pending pinch position when preserving the center', async (t) => {
  const view = await setupGestures(t)
  view.send('onPointerdown', 1, 200, 150)
  view.send('onPointerdown', 2, 400, 150)
  view.send('onPointermove', 2, 600, 150)
  view.control('Zoom in').props.onClick()
  await nextTick()
  assert.equal(view.percent(), '250%')
  assert.equal(view.viewport.scrollLeft, 175)
  assert.equal(view.viewport.scrollTop, 162.5)
})

test('pointer cancellation releases captures and prevents a pending scroll from applying', async (t) => {
  const view = await setupGestures(t)
  view.send('onPointerdown', 1, 200, 150)
  view.send('onPointerdown', 2, 400, 150)
  assert.equal(view.viewport.hasPointerCapture(1), true)
  assert.equal(view.viewport.hasPointerCapture(2), true)
  view.send('onPointermove', 2, 600, 150)
  view.send('onPointercancel', 2)
  await nextTick()
  assert.equal(view.percent(), '200%')
  assert.equal(view.viewport.scrollLeft, 0)
  assert.equal(view.viewport.scrollTop, 0)
  assert.equal(view.viewport.hasPointerCapture(1), false)
  assert.equal(view.viewport.hasPointerCapture(2), false)
  assert.equal(view.send('onPointermove', 1, 0, 0), false)
})
