import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { createRenderer, createSSRApp, h, nextTick } from 'vue'
import { renderToString } from '@vue/server-renderer'

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('/composables/useIsMobile.ts'))
      return {
        format: 'module',
        source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' }),
        shortCircuit: true,
      }
    return nextLoad(url, context)
  },
})
const { useIsMobile } = await import('../composables/useIsMobile.ts')
const responsiveLabel = {
  setup() {
    const isMobile = useIsMobile()
    return () => h('span', isMobile.value ? 'Mobile' : 'Desktop')
  },
}

const renderer = createRenderer({
  createElement: () => ({ text: '' }),
  insert(node, parent) {
    parent.child = node
  },
  remove() {},
  setElementText(node, text) {
    node.text = text
  },
  patchProp() {},
  parentNode: () => null,
  nextSibling: () => null,
})

function setup(t, width) {
  const listeners = new Set()
  const listenerCalls = { add: 0, remove: 0 }
  globalThis.window = {
    innerWidth: width,
    addEventListener(type, listener) {
      if (type === 'resize') {
        listenerCalls.add++
        listeners.add(listener)
      }
    },
    removeEventListener(type, listener) {
      if (type === 'resize') {
        listenerCalls.remove++
        listeners.delete(listener)
      }
    },
  }
  const apps = []
  t.after(() => {
    apps.forEach((app) => app.unmount())
    delete globalThis.window
  })
  return {
    mount(component = responsiveLabel) {
      const root = {}
      const app = renderer.createApp(component)
      app.mount(root)
      apps.push(app)
      return {
        label: () => root.child.text,
        unmount() {
          app.unmount()
          apps.splice(apps.indexOf(app), 1)
        },
      }
    },
    async resize(nextWidth) {
      window.innerWidth = nextWidth
      listeners.forEach((listener) => listener())
      await nextTick()
    },
    listeners,
    listenerCalls,
  }
}

test('responsive content switches to desktop at 768px and back below it', async (t) => {
  const { mount, resize } = setup(t, 767)
  const view = mount()
  await nextTick()
  assert.equal(view.label(), 'Mobile')
  await resize(767.99)
  assert.equal(view.label(), 'Mobile')
  await resize(768)
  assert.equal(view.label(), 'Desktop')
  await resize(1440)
  assert.equal(view.label(), 'Desktop')
  await resize(390)
  assert.equal(view.label(), 'Mobile')
})

test('each instance cleans up its listener and remount reads the current width', async (t) => {
  const { mount, resize, listeners, listenerCalls } = setup(t, 390)
  const first = mount()
  const second = mount()
  await nextTick()
  assert.equal(listeners.size, 2)
  assert.deepEqual(listenerCalls, { add: 2, remove: 0 })
  assert.equal(first.label(), 'Mobile')
  assert.equal(second.label(), 'Mobile')
  await resize(768)
  assert.equal(first.label(), 'Desktop')
  assert.equal(second.label(), 'Desktop')
  first.unmount()
  assert.equal(listeners.size, 1)
  assert.deepEqual(listenerCalls, { add: 2, remove: 1 })
  await resize(390)
  assert.equal(second.label(), 'Mobile')
  second.unmount()
  assert.equal(listeners.size, 0)
  assert.deepEqual(listenerCalls, { add: 2, remove: 2 })
  await resize(1024)
  const remounted = mount()
  await nextTick()
  assert.equal(listeners.size, 1)
  assert.deepEqual(listenerCalls, { add: 3, remove: 2 })
  assert.equal(remounted.label(), 'Desktop')
  await resize(320)
  assert.equal(remounted.label(), 'Mobile')
  remounted.unmount()
  assert.equal(listeners.size, 0)
  assert.deepEqual(listenerCalls, { add: 3, remove: 3 })
})

test('SSR renders without accessing browser globals', async () => {
  assert.equal(typeof window, 'undefined')
  assert.equal(await renderToString(createSSRApp(responsiveLabel)), '<span>Desktop</span>')
})

test('SSR and initial client render stay desktop while another mobile instance is active', async (t) => {
  const { mount, resize, listeners } = setup(t, 390)
  const existing = mount()
  await nextTick()
  assert.equal(existing.label(), 'Mobile')
  assert.equal(await renderToString(createSSRApp(responsiveLabel)), '<span>Desktop</span>')

  const initialValues = []
  const next = mount({
    setup() {
      const isMobile = useIsMobile()
      return () => {
        initialValues.push(isMobile.value)
        return h('span', isMobile.value ? 'Mobile' : 'Desktop')
      }
    },
  })
  assert.equal(initialValues[0], false)
  await nextTick()
  assert.equal(next.label(), 'Mobile')
  assert.equal(listeners.size, 2)

  await resize(1024)
  assert.equal(await renderToString(createSSRApp(responsiveLabel)), '<span>Desktop</span>')
  await resize(390)
  assert.equal(await renderToString(createSSRApp(responsiveLabel)), '<span>Desktop</span>')
})
