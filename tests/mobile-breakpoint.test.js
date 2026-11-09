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
  globalThis.window = {
    innerWidth: width,
    addEventListener(type, listener) {
      if (type === 'resize') listeners.add(listener)
    },
    removeEventListener(type, listener) {
      if (type === 'resize') listeners.delete(listener)
    },
  }
  const apps = []
  t.after(() => {
    apps.forEach((app) => app.unmount())
    delete globalThis.window
  })
  return {
    mount() {
      const root = {}
      const app = renderer.createApp(responsiveLabel)
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

test('unmounting one consumer keeps the other responsive and remounts initialize again', async (t) => {
  const { mount, resize, listeners } = setup(t, 390)
  const first = mount()
  const second = mount()
  await nextTick()
  first.unmount()
  assert.equal(listeners.size, 1)
  await resize(1024)
  assert.equal(second.label(), 'Desktop')
  second.unmount()
  assert.equal(listeners.size, 0)
  await resize(320)
  const remounted = mount()
  await nextTick()
  assert.equal(remounted.label(), 'Mobile')
})

test('SSR renders without accessing browser globals', async () => {
  assert.equal(typeof window, 'undefined')
  assert.equal(await renderToString(createSSRApp(responsiveLabel)), '<span>Desktop</span>')
})
