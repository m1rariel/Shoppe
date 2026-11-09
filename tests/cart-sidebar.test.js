import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { loadSfc, mountComponent, observeTree } from './helpers/sfc-runtime.js'
import { h, nextTick, reactive } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '~/stores/cartStore')
      return {
        url: 'data:text/javascript,export const useCartStore = () => globalThis.cartSidebarMock',
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
// CSS transition hooks need a browser DOM; retain the keyed list and its persistent host.
const transformSource = (source) =>
  source
    .replace('<Transition name="cart-sidebar">', '')
    .replace('</Transition>', '')
    .replaceAll('TransitionGroup', 'TestTransitionGroup')
const [component, itemComponent] = await Promise.all(
  ['CartSidebar', 'CartSidebarItem'].map((name) =>
    loadSfc(new URL(`../components/${name}.vue`, import.meta.url), { transformSource }),
  ),
)
const decorateNode = (element) =>
  Object.assign(element, {
    focus() {
      document.activeElement = this
    },
    contains(target) {
      return observeTree(this).all().includes(target)
    },
    closest(selector) {
      assert.equal(selector, '[inert]')
      let current = this
      while (current) {
        if (current.inert) return current
        current = current.parent
      }
      return null
    },
    querySelectorAll(selector) {
      return observeTree(this).all((child) => {
        if (selector === '.cart-sidebar__remove, .cart-sidebar__quantity-button')
          return ['cart-sidebar__remove', 'cart-sidebar__quantity-button'].includes(
            child.props.class,
          )
        return ['a', 'button'].includes(child.type) && !child.props.disabled
      })
    },
  })
const tick = async () => {
  await nextTick()
  await nextTick()
}
async function setup(t, image) {
  const listeners = new Set()
  globalThis.window = {
    addEventListener(type, handler) {
      listeners.add(handler)
    },
    removeEventListener(type, handler) {
      listeners.delete(handler)
    },
  }
  globalThis.document = { body: { style: { overflow: 'clip' } }, activeElement: null }
  const trigger = {
    focus() {
      document.activeElement = this
    },
  }
  trigger.focus()
  const cart = reactive({
    isSidebarOpen: false,
    isMutating: false,
    items: [
      {
        product: { id: 1, title: 'Gold ring', price: 1234.5, category: 'jewelry', image },
        quantity: 2,
      },
    ],
    get totalItems() {
      return this.items.reduce((total, item) => total + item.quantity, 0)
    },
    get subtotal() {
      return this.items.reduce((total, item) => total + item.quantity * item.product.price, 0)
    },
    closeSidebar() {
      cart.isSidebarOpen = false
    },
    removeItem(id) {
      cart.items = cart.items.filter((item) => item.product.id !== id)
    },
    adjustQuantity(id, delta) {
      const item = cart.items.find((item) => item.product.id === id)
      item.quantity += delta
      if (!item.quantity) cart.removeItem(id)
    },
  })
  globalThis.cartSidebarMock = cart
  const view = mountComponent(t, component, {
    decorateNode,
    components: {
      Transition: {
        setup:
          (_, { slots }) =>
          () =>
            slots.default?.(),
      },
      CartSidebarItem: itemComponent,
      TestTransitionGroup: {
        props: ['tag', 'name'],
        setup:
          (props, { slots }) =>
          () =>
            h(props.tag, slots.default?.()),
      },
      NuxtLink: {
        props: ['to'],
        setup:
          (props, { slots }) =>
          () =>
            h('a', { href: props.to }, slots.default?.()),
      },
    },
  })
  const { unmount, find } = view
  t.after(() => {
    unmount()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.cartSidebarMock
  })
  return {
    cart,
    trigger,
    find,
    unmount,
    listeners,
    async open() {
      cart.isSidebarOpen = true
      await tick()
    },
    async key(event) {
      listeners.forEach((handler) => handler({ preventDefault() {}, ...event }))
      await tick()
    },
  }
}

test('busy bag blocks rapid edits, keeps status through empty state and reopen, and recovers', async (t) => {
  const view = await setup(t)
  let calls = 0
  view.cart.adjustQuantity = () => {
    calls++
    view.cart.isMutating = true
  }
  await view.open()
  const increase = view.find((n) => n.props['aria-label'] === 'Increase quantity of Gold ring')
  const remove = view.find((n) => n.props['aria-label'] === 'Remove Gold ring from shopping bag')
  increase.focus()
  increase.props.onClick()
  increase.props.onClick()
  remove.props.onClick()
  assert.equal(calls, 1)
  assert.equal(view.cart.items.length, 1)
  await tick()
  assert.equal(increase.props.disabled, true)
  assert.equal(remove.props.disabled, true)
  assert.equal(view.find((n) => n.props.role === 'status').text.trim(), 'Updating your bag…')
  assert.equal(
    document.activeElement,
    view.find((n) => n.props['aria-label'] === 'Close shopping bag'),
  )
  await view.key({ key: 'Tab', shiftKey: true })
  assert.equal(
    document.activeElement,
    view.find((n) => n.type === 'a'),
  )
  await view.key({ key: 'Escape' })
  assert.equal(document.body.style.overflow, 'clip')
  assert.equal(document.activeElement, view.trigger)
  await view.open()
  assert.equal(view.find((n) => n.props.role === 'status').text.trim(), 'Updating your bag…')
  assert.equal(
    view.find((n) => n.props['aria-label'] === 'Increase quantity of Gold ring').props.disabled,
    true,
  )
  view.cart.items = []
  await tick()
  assert.ok(view.find((n) => n.props.role === 'status'))
  view.cart.isMutating = false
  await tick()
  assert.equal(
    view.find((n) => n.props.role === 'status'),
    undefined,
  )
  view.cart.items = [
    { product: { id: 1, title: 'Gold ring', price: 10, category: 'jewelry' }, quantity: 1 },
  ]
  await tick()
  const recovered = view.find((n) => n.props['aria-label'] === 'Increase quantity of Gold ring')
  assert.equal(recovered.props.disabled, false)
  recovered.props.onClick()
  assert.equal(calls, 2)
})

test('dialog focuses close, traps both Tab directions, and Escape restores page and trigger', async (t) => {
  const view = await setup(t)
  await view.open()
  const panel = view.find((n) => n.props.role === 'dialog')
  assert.equal(panel.props['aria-modal'], 'true')
  assert.equal(view.find((n) => n.props.id === panel.props['aria-labelledby']).text, 'Shopping bag')
  const controls = panel.querySelectorAll()
  assert.equal(document.activeElement, controls[0])
  assert.equal(document.body.style.overflow, 'hidden')
  await view.key({ key: 'Tab', shiftKey: true })
  assert.equal(document.activeElement, controls.at(-1))
  await view.key({ key: 'Tab' })
  assert.equal(document.activeElement, controls[0])
  await view.key({ key: 'Escape' })
  assert.equal(view.cart.isSidebarOpen, false)
  assert.equal(document.activeElement, view.trigger)
  assert.equal(document.body.style.overflow, 'clip')
})

test('close control, overlay, and unmount release scroll lock and restore focus', async (t) => {
  const view = await setup(t)
  for (const selector of [
    (n) => n.props['aria-label'] === 'Close shopping bag',
    (n) => n.props.class === 'cart-sidebar__overlay',
  ]) {
    await view.open()
    view.find(selector).props.onClick()
    await tick()
    assert.equal(document.body.style.overflow, 'clip')
    assert.equal(document.activeElement, view.trigger)
  }
  await view.open()
  view.unmount()
  assert.equal(document.body.style.overflow, 'clip')
  assert.equal(document.activeElement, view.trigger)
  assert.equal(view.listeners.size, 0)
})

test('quantity controls update count and subtotal, removal exposes empty state', async (t) => {
  const view = await setup(t)
  await view.open()
  const text = () =>
    observeTree(view.find((n) => n.props.role === 'dialog'))
      .all()
      .map((n) => n.text)
      .join(' ')
  assert.match(text(), /2,469\.00/)
  assert.match(text(), /1,234\.50/)
  view.find((n) => n.props['aria-label'] === 'Increase quantity of Gold ring').props.onClick()
  await tick()
  assert.match(text(), /Subtotal \(3 items\)/)
  assert.match(text(), /3,703\.50/)
  view.find((n) => n.props['aria-label'] === 'Decrease quantity of Gold ring').props.onClick()
  await tick()
  assert.match(text(), /Subtotal \(2 items\)/)
  assert.equal(view.find((n) => n.type === 'a').props.href, '/checkout')
  view.find((n) => n.props['aria-label'] === 'Remove Gold ring from shopping bag').props.onClick()
  await tick()
  assert.match(text(), /Your shopping bag is empty/)
  assert.equal(
    view.find((n) => n.type === 'a'),
    undefined,
  )
})

test('Tab returns focus to the dialog after its focused item is removed', async (t) => {
  const view = await setup(t)
  await view.open()
  const remove = view.find((n) => n.props['aria-label'] === 'Remove Gold ring from shopping bag')
  remove.focus()
  remove.props.onClick()
  await tick()
  assert.match(
    observeTree(view.find((n) => n.props.role === 'dialog'))
      .all()
      .map((n) => n.text)
      .join(' '),
    /Your shopping bag is empty/,
  )
  document.activeElement = document.body
  await view.key({ key: 'Tab' })
  assert.equal(
    document.activeElement,
    view.find((n) => n.props['aria-label'] === 'Close shopping bag'),
  )
})

test('missing and failed product images expose a readable product-specific fallback', async (t) => {
  const view = await setup(t)
  await view.open()
  assert.ok(view.find((n) => n.props['aria-label'] === 'Image unavailable for Gold ring'))
  view.cart.items[0].product.image = '/ring.jpg'
  await tick()
  const image = view.find((n) => n.type === 'img')
  assert.equal(image.props.alt, 'Gold ring')
  image.props.onError()
  await tick()
  assert.equal(
    view.find((n) => n.type === 'img'),
    undefined,
  )
  assert.ok(view.find((n) => n.props['aria-label'] === 'Image unavailable for Gold ring'))
})

test('quantity edits preserve the keyed row and removing the last item preserves the list host', async (t) => {
  const view = await setup(t)
  await view.open()
  const list = view.find((n) => n.type === 'ul')
  const item = view.find((n) => n.type === 'li')
  view.find((n) => n.props['aria-label'] === 'Increase quantity of Gold ring').props.onClick()
  await tick()
  assert.equal(
    view.find((n) => n.type === 'li'),
    item,
  )
  view.cart.removeItem(1)
  await tick()
  assert.equal(
    view.find((n) => n.type === 'ul'),
    list,
  )
  assert.equal(
    view.find((n) => n.type === 'li'),
    undefined,
  )
  assert.ok(view.find((n) => n.text.trim() === 'Your shopping bag is empty'))
})

test('a leaving last row releases focus and defers the empty message until leave completes', async (t) => {
  const view = await setup(t)
  await view.open()
  const list = view.find((n) => n.type === 'ul')
  const item = view.find((n) => n.type === 'li')
  const remove = view.find((n) => n.props['aria-label'] === 'Remove Gold ring from shopping bag')
  const close = view.find((n) => n.props['aria-label'] === 'Close shopping bag')
  let inert = false
  Object.defineProperty(item, 'inert', {
    get: () => inert,
    set(value) {
      inert = value
      if (value && item.contains(document.activeElement)) document.activeElement = document.body
    },
  })
  remove.focus()
  list.props.onBeforeLeave(item)
  view.cart.removeItem(1)
  await tick()
  assert.equal(document.activeElement, close)
  assert.equal(item.inert, true)
  assert.equal(
    view.find((n) => n.text.trim() === 'Your shopping bag is empty'),
    undefined,
  )
  list.props.onAfterLeave(item)
  await tick()
  assert.ok(view.find((n) => n.text.trim() === 'Your shopping bag is empty'))
  list.props.onBeforeEnter(item)
  assert.equal(item.inert, false)
})
