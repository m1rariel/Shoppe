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
      return { url: 'data:text/javascript,export const useCartStore=()=>({})', shortCircuit: true }
    if (specifier === '~/composables/useNotification')
      return {
        url: 'data:text/javascript,export const NotificationTypes={SUCCESS:"success",ERROR:"error"};export const useNotification=()=>({showNotification:payload=>globalThis.sharingTest.push(payload)})',
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
const component = await loadSfc(new URL('../components/ProductInfo.vue', import.meta.url))
const product = { id: 1, title: 'Кольцо & gold? #1', price: 5, category: 'jewelry' }
const url = 'https://shoppe.test/products/1'
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function setup(t, capabilities = {}) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: capabilities })
  globalThis.sharingTest = []
  let focused, selected
  const view = mountComponent(t, component, {
    props: { product: { ...product }, productUrl: url },
    components: {
      BaseButton: {
        setup:
          (_, { attrs, slots }) =>
          () =>
            h('button', attrs, slots.default?.()),
      },
    },
    decorateNode(node) {
      node.focus = () => {
        focused = node
      }
      node.select = () => {
        selected = node
      }
    },
  })
  t.after(() => {
    view.unmount()
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
    delete globalThis.sharingTest
  })
  await nextTick()
  const control = (label) => view.find((n) => n.props['aria-label'] === label)
  return {
    ...view,
    share: () => control('Share product').props.onClick(),
    copy: () => control('Copy product link for Instagram').props.onClick(),
    control,
    input: () => view.find((n) => n.type === 'input'),
    focus: () => ({ focused, selected }),
    notifications: globalThis.sharingTest,
  }
}

test('native share receives the current title and URL synchronously and cancellation stays quiet', async (t) => {
  const calls = []
  const capabilities = {
    share(payload) {
      assert.equal(this, capabilities)
      calls.push(payload)
      return Promise.resolve()
    },
  }
  const view = await setup(t, capabilities)
  const result = view.share()
  assert.deepEqual(calls, [{ title: product.title, url }])
  await result
  assert.deepEqual(view.notifications, [])
  capabilities.share = async () => {
    throw Object.assign(new Error('cancel'), { name: 'AbortError' })
  }
  await view.share()
  assert.deepEqual(view.notifications, [])
  assert.equal(view.input(), undefined)
  view.props.product = { ...product, id: 2, title: 'New title' }
  view.props.productUrl = 'https://shoppe.test/products/2'
  await nextTick()
  capabilities.share = (payload) => {
    calls.push(payload)
  }
  await view.share()
  assert.deepEqual(calls.at(-1), { title: 'New title', url: 'https://shoppe.test/products/2' })
})

test('absent share and Instagram copy the URL with success only after clipboard resolves', async (t) => {
  const work = deferred()
  const copied = []
  const view = await setup(t, {
    clipboard: {
      writeText(value) {
        copied.push(value)
        return work.promise
      },
    },
  })
  const result = view.share()
  assert.deepEqual(copied, [url])
  assert.deepEqual(view.notifications, [])
  work.resolve()
  await result
  assert.deepEqual(view.notifications, [{ message: 'Ссылка скопирована', type: 'success' }])
  await view.copy()
  assert.deepEqual(copied, [url, url])
  assert.equal(view.input(), undefined)
})

test('absent, rejected and throwing clipboard capabilities reveal a labelled readonly focused selected URL', async (t) => {
  const capabilities = {}
  const view = await setup(t, capabilities)
  for (const clipboard of [
    undefined,
    {
      writeText: async () => {
        throw new Error('denied')
      },
    },
    {
      get writeText() {
        throw new Error('blocked')
      },
    },
  ]) {
    capabilities.clipboard = clipboard
    await view.copy()
    const input = view.input()
    assert.equal(input.props.value, url)
    assert.ok('readonly' in input.props)
    assert.equal(input.parent.type, 'label')
    assert.match(input.parent.children[0].text, /Product link/)
    assert.deepEqual(view.focus(), { focused: input, selected: input })
    assert.deepEqual(view.notifications, [])
  }
  Object.defineProperty(capabilities, 'clipboard', {
    get() {
      throw new Error('blocked')
    },
  })
  await view.share()
  assert.equal(view.input().props.value, url)
  view.props.product = { ...product, id: 2 }
  view.props.productUrl = 'https://shoppe.test/products/2'
  await nextTick()
  assert.equal(view.input(), undefined)
  await view.copy()
  assert.equal(view.input().props.value, 'https://shoppe.test/products/2')
})

test('share rejection or getter failure gives an honest error and manual link; AbortError objects stay quiet', async (t) => {
  const capabilities = {
    share: async () => {
      throw new Error('denied')
    },
  }
  const view = await setup(t, capabilities)
  await view.share()
  assert.equal(view.notifications[0].type, 'error')
  assert.equal(view.input().props.value, url)
  Object.defineProperty(capabilities, 'share', {
    configurable: true,
    get() {
      throw new Error('blocked')
    },
  })
  await view.share()
  assert.equal(view.notifications.length, 2)
  assert.equal(view.input().props.value, url)
  Object.defineProperty(capabilities, 'share', {
    value: async () => {
      throw { name: 'AbortError' }
    },
  })
  await view.share()
  assert.equal(view.notifications.length, 2)
  assert.equal(view.input(), undefined)
})

test('pending clipboard/share results cannot notify or reveal an old product after navigation or unmount', async (t) => {
  const capabilities = {}
  const view = await setup(t, capabilities)
  for (const native of [false, true]) {
    for (const fail of [false, true]) {
      const work = deferred()
      capabilities.share = native ? () => work.promise : undefined
      capabilities.clipboard = { writeText: () => work.promise }
      const result = view.share()
      view.props.product = { ...product, id: view.props.product.id + 1 }
      view.props.productUrl = `https://shoppe.test/products/${view.props.product.id}`
      await nextTick()
      if (fail) work.reject(new Error('denied'))
      else work.resolve()
      await result
      assert.deepEqual(view.notifications, [])
      assert.equal(view.input(), undefined)
    }
  }
  const work = deferred()
  capabilities.share = undefined
  capabilities.clipboard = { writeText: () => work.promise }
  const result = view.copy()
  view.unmount()
  work.reject(new Error('denied'))
  await result
  assert.deepEqual(view.notifications, [])
})

test('a newer action wins over an older pending clipboard operation', async (t) => {
  const work = deferred()
  const capabilities = { clipboard: { writeText: () => work.promise } }
  const view = await setup(t, capabilities)
  const old = view.copy()
  capabilities.clipboard = undefined
  await view.copy()
  const input = view.input()
  work.resolve()
  await old
  assert.equal(view.input(), input)
  assert.deepEqual(view.notifications, [])
})

test('email and social links encode the current product and external links have safe new-tab attributes', async (t) => {
  const view = await setup(t)
  const email = view.control('Share product by email')
  const parsed = new URL(email.props.href)
  assert.equal(parsed.searchParams.get('subject'), product.title)
  assert.equal(parsed.searchParams.get('body'), `${product.title}\n${url}`)
  for (const [label, host, path, key] of [
    ['Share product on Facebook', 'www.facebook.com', '/sharer/sharer.php', 'u'],
    ['Share product on Twitter', 'twitter.com', '/intent/tweet', 'url'],
  ]) {
    const link = view.control(label)
    const parsed = new URL(link.props.href)
    assert.equal(parsed.hostname, host)
    assert.equal(parsed.pathname, path)
    assert.equal(parsed.searchParams.get(key), url)
    assert.equal(link.props.target, '_blank')
    assert.equal(link.props.rel, 'noopener noreferrer')
  }
  assert.equal(
    new URL(view.control('Share product on Twitter').props.href).searchParams.get('text'),
    product.title,
  )
  assert.equal(view.control('Copy product link for Instagram').type, 'button')
  view.props.product = { ...product, id: 2, title: 'Second & title' }
  view.props.productUrl = 'https://shoppe.test/products/2'
  await nextTick()
  assert.equal(
    new URL(view.control('Share product on Facebook').props.href).searchParams.get('u'),
    view.props.productUrl,
  )
  assert.equal(
    new URL(view.control('Share product by email').props.href).searchParams.get('subject'),
    'Second & title',
  )
})
