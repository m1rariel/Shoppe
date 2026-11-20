import { nextTick } from 'vue'
import { mountComponent } from './sfc-runtime.js'

export const hasClass = (name) => (node) => String(node.props.class).split(' ').includes(name)

export async function setupZoom(t, component, images = ['/a.jpg', '/b.jpg'], viewer) {
  globalThis.detailTest = { sliders: [] }
  const previousDocument = globalThis.document
  const previousWindow = globalThis.window
  const browser = { body: { style: { overflow: 'auto' } }, activeElement: null }
  globalThis.document = browser
  globalThis.window = { matchMedia: () => ({ matches: true }) }
  const view = mountComponent(t, component, {
    props: { images, productTitle: 'Ring' },
    components: viewer ? { ProductImageViewer: viewer } : {},
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
