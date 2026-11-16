import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h, markRaw, nextTick, reactive } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '#imports')
      return {
        url: `data:text/javascript,export { useIsMobile } from '${new URL('../composables/useIsMobile.ts', import.meta.url).href}'; export const useRoute = () => globalThis.menuMocks.route; export const useRouter = () => globalThis.menuMocks.router`,
        shortCircuit: true,
      }
    if (specifier === '~/stores/cartStore')
      return {
        url: 'data:text/javascript,export const useCartStore = () => globalThis.menuMocks.cart',
        shortCircuit: true,
      }
    if (specifier.endsWith('.svg'))
      return {
        url: 'data:text/javascript,export default { render: () => null }',
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts'))
      return {
        format: 'module',
        source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' }),
        shortCircuit: true,
      }
    return nextLoad(url, context)
  },
})
const { descriptor } = parse(
  readFileSync(new URL('../components/MobileMenu.vue', import.meta.url), 'utf8'),
)
const compiled = compileScript(descriptor, {
  id: 'mobile-menu-test',
  inlineTemplate: true,
  templateOptions: { compilerOptions: { hoistStatic: false } },
})
const { default: component } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(compiled.content, { mode: 'transform' })).toString('base64')}`
)
const walk = (node) => [node, ...node.children.flatMap(walk)]
const node = (type, text = '') =>
  markRaw({
    type,
    tagName: type.toUpperCase(),
    text,
    props: {},
    children: [],
    addEventListener() {},
    focus() {
      document.activeElement = this
    },
    querySelectorAll() {
      return walk(this).filter(
        (child) => ['a', 'button', 'input'].includes(child.type) && !child.props.disabled,
      )
    },
  })
const renderer = createRenderer({
  createElement: (type) => node(type),
  createText: (text) => node('text', text),
  createComment: (text) => node('comment', text),
  insert(child, parent, anchor) {
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(child)
    else parent.children.splice(index, 0, child)
  },
  remove(child) {
    child.parent.children.splice(child.parent.children.indexOf(child), 1)
  },
  setElementText(element, text) {
    element.text = text
  },
  setText(element, text) {
    element.text = text
  },
  patchProp(element, key, previous, next) {
    element.props[key] = next
  },
  parentNode: (element) => element.parent,
  nextSibling: () => null,
})
async function setup(t, props = {}) {
  const listeners = new Set()
  globalThis.window = {
    innerWidth: 320,
    addEventListener(type, fn) {
      listeners.add(fn)
    },
    removeEventListener(type, fn) {
      listeners.delete(fn)
    },
  }
  globalThis.document = { body: { style: { overflow: 'auto' } }, activeElement: null }
  const navigations = []
  const route = reactive({ fullPath: '/' })
  const cart = reactive({
    totalItems: 2,
    isSidebarOpen: false,
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    },
  })
  globalThis.menuMocks = { route, cart, router: { push: (to) => navigations.push(to) } }
  const root = node('root')
  const app = renderer.createApp(component, props)
  app.component('NuxtLink', {
    props: ['to'],
    setup:
      (props, { slots }) =>
      () =>
        h('a', { href: props.to }, slots.default?.()),
  })
  app.component('BaseButton', {
    setup:
      (_, { slots }) =>
      () =>
        h('button', { type: 'button' }, slots.default?.()),
  })
  app.mount(root)
  await nextTick()
  let mounted = true
  const unmount = () => {
    if (mounted) app.unmount()
    mounted = false
  }
  t.after(() => {
    unmount()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.menuMocks
  })
  const find = (predicate) => walk(root).find(predicate)
  const trigger = find((n) => n.props['aria-controls'] === 'mobile-navigation')
  return {
    find,
    trigger,
    cart,
    route,
    navigations,
    unmount,
    async open() {
      trigger.focus()
      await trigger.props.onClick()
      await nextTick()
    },
    async resize(width) {
      window.innerWidth = width
      listeners.forEach((fn) => fn())
      await nextTick()
    },
  }
}

test('menu focuses search, traps Tab, and Escape restores focus and scroll', async (t) => {
  const view = await setup(t)
  await view.open()
  const panel = view.find((n) => n.props.role === 'dialog')
  assert.equal(panel.props['aria-modal'], true)
  assert.equal(document.activeElement.props.type, 'search')
  assert.equal(document.body.style.overflow, 'hidden')
  const controls = panel.querySelectorAll()
  controls.at(-1).focus()
  panel.props.onKeydown({ key: 'Tab', preventDefault() {} })
  assert.equal(document.activeElement, controls[0])
  panel.props.onKeydown({ key: 'Tab', shiftKey: true, preventDefault() {} })
  assert.equal(document.activeElement, controls.at(-1))
  panel.props.onKeydown({ key: 'Escape', preventDefault() {} })
  await nextTick()
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.activeElement, view.trigger)
  assert.equal(document.body.style.overflow, 'auto')
})

test('search submits trimmed catalog query, including empty search with hideSearch', async (t) => {
  const view = await setup(t, { hideSearch: true })
  assert.equal(
    view.find((n) => n.props.type === 'search'),
    undefined,
  )
  await view.open()
  view.find((n) => n.props.type === 'search').props['onUpdate:modelValue']('  gold ring  ')
  view.find((n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  await nextTick()
  assert.deepEqual(view.navigations, [{ path: '/products', query: { search: 'gold ring' } }])
  assert.equal(view.trigger.props['aria-expanded'], false)
  await view.open()
  view.find((n) => n.props.type === 'search').props['onUpdate:modelValue']('   ')
  view.find((n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(view.navigations.at(-1), { path: '/products', query: {} })
})

test('route changes, desktop resize and unmount release the menu scroll lock', async (t) => {
  const view = await setup(t)
  await view.open()
  view.route.fullPath = '/products'
  await nextTick()
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.body.style.overflow, 'auto')
  await view.open()
  await view.resize(768)
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.body.style.overflow, 'auto')
  await view.resize(320)
  document.body.style.overflow = 'clip'
  await view.open()
  view.unmount()
  assert.equal(document.body.style.overflow, 'clip')
})

test('cart opening closes menu without restoring focus over the cart', async (t) => {
  const view = await setup(t)
  await view.open()
  const cartButton = view.find((n) => n.props['aria-label'] === 'Open shopping bag (2 items)')
  cartButton.focus()
  cartButton.props.onClick()
  await nextTick()
  assert.equal(view.cart.isSidebarOpen, true)
  assert.equal(view.trigger.props['aria-expanded'], false)
  assert.equal(document.activeElement, cartButton)
  assert.equal(document.body.style.overflow, 'auto')
  view.cart.isSidebarOpen = false
  await view.open()
  view.cart.isSidebarOpen = true
  await nextTick()
  assert.equal(view.trigger.props['aria-expanded'], false)
})

test('account links and logo retain existing destinations and close the menu', async (t) => {
  const view = await setup(t)
  for (const href of ['/#account', '/#logout', '/']) {
    await view.open()
    const link = view.find((n) => n.type === 'a' && n.props.href === href)
    link.props.onClick()
    await nextTick()
    assert.equal(view.trigger.props['aria-expanded'], false)
  }
})
