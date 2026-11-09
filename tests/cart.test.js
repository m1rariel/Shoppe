import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { IDBFactory, IDBDatabase, IDBObjectStore } from 'fake-indexeddb'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '~/composables/api/carts/useAddNewCart')
      return {
        url: 'data:text/javascript,export const useAddNewCart=()=>((userId,items)=>globalThis.cartPost(userId,items))',
        shortCircuit: true,
      }
    if (specifier === '#imports')
      return {
        url: new URL('../stores/notificationStore.ts', import.meta.url).href,
        shortCircuit: true,
      }
    if (specifier.startsWith('~/') || specifier.startsWith('@/'))
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      }
    return nextResolve(specifier, context)
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
const { useCartStore } = await import('../stores/cartStore.ts')
const { useNotificationStore } = await import('../stores/notificationStore.ts')
const product = (id = 1, title = 'Ring') => ({
  id,
  title,
  price: 10,
  category: 'jewelry',
  description: '',
})
const entry = (quantity = 1, item = product()) => ({ product: item, quantity })
const snapshot = (revision, items) => JSON.stringify({ version: 1, revision, items })

test('pending state covers queued intents through held and rejected POSTs, then recovers', async (t) => {
  const { cart } = setup(t)
  const requests = []
  globalThis.cartPost = () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
  const first = cart.addItem(product())
  const second = cart.removeItem(1)
  assert.equal(cart.isMutating, true)
  while (requests.length < 1) await new Promise(setImmediate)
  assert.equal(cart.totalItems, 1)
  assert.equal(cart.isMutating, true)
  requests[0].reject(Error('timeout'))
  await first
  assert.equal(cart.isMutating, true)
  while (requests.length < 2) await new Promise(setImmediate)
  assert.equal(cart.totalItems, 0)
  assert.equal(cart.isMutating, true)
  requests[1].resolve({ id: 11 })
  assert.equal(await second, true)
  assert.equal(cart.isMutating, false)
  assert.equal(await cart.addItem(product(), -1), false)
  assert.equal(cart.isMutating, false)
  useNotificationStore().hideNotification()
})

test('adding and adding again updates the bag and offers an action without opening it', async (t) => {
  const { cart } = setup(t)
  assert.equal(await cart.addItem(product()), true)
  const notification = useNotificationStore()
  assert.equal(cart.isSidebarOpen, false)
  assert.equal(notification.visible, true)
  assert.equal(notification.type, 'success')
  assert.equal(notification.action, 'open-cart')
  assert.equal(notification.actionText, 'View bag')
  assert.match(notification.message, /Ring was added/)
  assert.equal(await cart.addItem(product(), 2), true)
  assert.equal(cart.items.length, 1)
  assert.equal(cart.totalItems, 3)
  assert.equal(cart.isSidebarOpen, false)
  notification.hideNotification()
})

function setup(t, raw = null) {
  const posts = []
  globalThis.cartPost = async (userId, items) => {
    posts.push({ userId, items: JSON.parse(JSON.stringify(items)) })
    return { id: 11 }
  }
  const memory = new Map(raw === null ? [] : [['cart', raw]])
  const storage = {
    failRead: false,
    failWrite: false,
    getItem(key) {
      if (this.failRead) throw Error('read')
      return memory.get(key) ?? null
    },
    setItem(key, value) {
      if (this.failWrite) throw Error('write')
      memory.set(key, value)
    },
  }
  const browser = { localStorage: storage, indexedDB: new IDBFactory() }
  globalThis.window = browser
  t.after(() => {
    delete globalThis.window
    delete globalThis.cartPost
  })
  const fresh = () => {
    setActivePinia(createPinia())
    return useCartStore()
  }
  return { cart: fresh(), fresh, browser, storage, memory, posts }
}

async function backup(browser, value) {
  const db = await new Promise((resolve, reject) => {
    const request = browser.indexedDB.open('shoppe-cart', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', value === undefined ? 'readonly' : 'readwrite')
      const request =
        value === undefined
          ? tx.objectStore('snapshots').get('cart')
          : tx.objectStore('snapshots').put(value, 'cart')
      let result
      request.onsuccess = () => {
        result = request.result
      }
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

test('legacy restore salvages valid entries, sums duplicates, uses last snapshot before first add', async (t) => {
  const { cart, memory } = setup(
    t,
    JSON.stringify([
      entry(2),
      null,
      {},
      entry(-1),
      entry(1, product(1, 'Updated')),
      entry(1, { ...product(2), price: null }),
      entry(1, { ...product(3), image: 4 }),
      entry(1, { ...product(4), title: 4 }),
      entry(1, { ...product(5), id: 0 }),
    ]),
  )
  await cart.addItem(product(2))
  assert.equal(cart.items.length, 2)
  assert.equal(cart.items[0].quantity, 3)
  assert.equal(cart.items[0].product.title, 'Updated')
  assert.equal(cart.totalItems, 4)
  assert.equal(cart.subtotal, 40)
  assert.equal(JSON.parse(memory.get('cart')).version, 1)
})

test('invalid quantities and invalid products leave state and saved payload unchanged', async (t) => {
  const { cart, memory } = setup(t)
  await cart.addItem(product())
  const saved = memory.get('cart')
  cart.closeSidebar()
  for (const quantity of [0, -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(await cart.addItem(product(), quantity), false)
  }
  for (const quantity of [-1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(await cart.updateQuantity(1, quantity), false)
  }
  for (const invalid of [
    null,
    {},
    { ...product(), price: Infinity },
    { ...product(), price: -1 },
  ]) {
    assert.equal(await cart.addItem(invalid), false)
  }
  assert.equal(memory.get('cart'), saved)
  assert.equal(cart.isSidebarOpen, false)
  assert.equal(cart.totalItems, 1)
  await cart.updateQuantity(1, Number.MAX_SAFE_INTEGER)
  assert.equal(await cart.addItem(product()), false)
  assert.equal(cart.items[0].quantity, Number.MAX_SAFE_INTEGER)
})

test('last added product is copied and replaces the snapshot; absolute zero and minus one delete', async (t) => {
  const { cart, fresh } = setup(t)
  await cart.addItem(product())
  const updated = { ...product(1, 'New'), price: 20, image: 'new.jpg' }
  const pending = cart.addItem(updated, 2)
  updated.title = 'Caller mutation'
  await pending
  assert.equal(cart.items[0].product.title, 'New')
  assert.equal(cart.totalItems, 3)
  assert.equal(cart.subtotal, 60)
  await cart.updateQuantity(1, 0)
  const restored = fresh()
  await restored.initialize()
  assert.deepEqual(restored.items, [])
  await restored.addItem(product())
  await restored.adjustQuantity(1, -1)
  assert.deepEqual(restored.items, [])
})

test('failed primary writes fall back, newest copy wins on reload, empty tombstone defeats stale main', async (t) => {
  const { cart, fresh, storage, memory, browser } = setup(t)
  await cart.addItem(product())
  const stale = memory.get('cart')
  storage.failWrite = true
  assert.equal(await cart.addItem(product(2)), true)
  assert.equal(memory.get('cart'), stale)
  let restored = fresh()
  await restored.initialize()
  assert.equal(restored.totalItems, 2)
  await restored.removeItem(1)
  await restored.removeItem(2)
  assert.deepEqual(JSON.parse(await backup(browser)).items, [])
  restored = fresh()
  await restored.initialize()
  assert.deepEqual(restored.items, [])
  storage.failWrite = false
  await restored.addItem(product(3))
  assert.equal(JSON.parse(memory.get('cart')).items[0].product.id, 3)
})

test('newer primary wins; unreadable, missing, malformed copies do not overwrite the good backup', async (t) => {
  const { fresh, browser, memory, storage } = setup(t, snapshot(20, [entry(2)]))
  await backup(browser, snapshot(10, [entry(1, product(2))]))
  let cart = fresh()
  await cart.initialize()
  assert.equal(cart.items[0].product.id, 1)
  memory.set('cart', '{broken')
  cart = fresh()
  await cart.initialize()
  assert.equal(cart.items[0].product.id, 2)
  assert.equal(JSON.parse(await backup(browser)).revision, 10)
  storage.failRead = true
  cart = fresh()
  await cart.initialize()
  assert.equal(cart.items[0].product.id, 2)
  storage.failRead = false
  memory.delete('cart')
  cart = fresh()
  await cart.initialize()
  assert.equal(cart.items[0].product.id, 2)
  memory.set('cart', snapshot(30, [entry(3), entry(-1), null]))
  cart = fresh()
  await cart.initialize()
  assert.equal(cart.totalItems, 3)
})

test('fully unreadable or unsupported payloads become empty without destructive initialization writes', async (t) => {
  const { fresh, browser, memory } = setup(t, '{broken')
  await backup(browser, 'broken')
  for (const payload of [
    '{broken',
    'null',
    '{}',
    snapshot(-1, []),
    JSON.stringify({ version: 2, revision: 10, items: [entry()] }),
  ]) {
    memory.set('cart', payload)
    const cart = fresh()
    await cart.initialize()
    assert.deepEqual(cart.items, [])
    assert.equal(memory.get('cart'), payload)
    assert.equal(await backup(browser), 'broken')
  }
})

test('both write failures rollback all mutations, notify ERROR and queue recovers', async (t) => {
  const { cart, browser, storage } = setup(t)
  await cart.addItem(product())
  const healthy = browser.indexedDB
  browser.indexedDB = {
    open() {
      throw Error('unavailable')
    },
  }
  storage.failWrite = true
  cart.closeSidebar()
  for (const mutate of [
    () => cart.addItem(product(2)),
    () => cart.updateQuantity(1, 4),
    () => cart.removeItem(1),
  ]) {
    assert.equal(await mutate(), false)
    assert.equal(cart.totalItems, 1)
    assert.equal(cart.isSidebarOpen, false)
    assert.equal(useNotificationStore().type, 'error')
  }
  storage.failWrite = false
  browser.indexedDB = healthy
  assert.equal(await cart.addItem(product(2)), true)
  assert.equal(cart.totalItems, 2)
})

test('cart storage error follows existing notification expiry after successful retry', async (t) => {
  const { cart, browser, storage } = setup(t)
  await cart.initialize()
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const healthy = browser.indexedDB
  browser.indexedDB = {
    open() {
      throw Error('unavailable')
    },
  }
  storage.failWrite = true
  assert.equal(await cart.addItem(product()), false)
  const notification = useNotificationStore()
  assert.equal(notification.visible, true)
  assert.equal(notification.type, 'error')
  storage.failWrite = false
  browser.indexedDB = healthy
  assert.equal(await cart.addItem(product()), true)
  t.mock.timers.tick(4999)
  assert.equal(notification.visible, true)
  t.mock.timers.tick(1)
  assert.equal(notification.visible, false)
  assert.equal(notification.message, '')
})

test('concurrent add/remove and delta UI intents serialize against committed state', async (t) => {
  const { cart } = setup(t, JSON.stringify([entry(2)]))
  const initialization = cart.initialize()
  await Promise.all([cart.addItem(product()), cart.addItem(product()), initialization])
  assert.equal(cart.totalItems, 4)
  await cart.updateQuantity(1, 1)
  await Promise.all([cart.adjustQuantity(1, 1), cart.adjustQuantity(1, 1)])
  assert.equal(cart.totalItems, 3)
  await Promise.all([cart.adjustQuantity(1, -1), cart.adjustQuantity(1, -1)])
  assert.equal(cart.totalItems, 1)
  await Promise.all([cart.removeItem(1), cart.addItem(product(2)), cart.addItem(product(2))])
  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].product.id, 2)
  assert.equal(cart.totalItems, 2)
})

test('SSR never accesses browser storage', async () => {
  delete globalThis.window
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw Error('SSR storage touched')
    },
  })
  try {
    setActivePinia(createPinia())
    const cart = useCartStore()
    await cart.initialize()
    assert.deepEqual(cart.items, [])
    assert.equal(await cart.addItem(product()), false)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  }
})

test('SecurityError accessing storage property falls back to IndexedDB', async (t) => {
  const { cart, browser, fresh } = setup(t)
  Object.defineProperty(browser, 'localStorage', {
    get() {
      throw Error('SecurityError')
    },
  })
  assert.equal(await cart.addItem(product()), true)
  const reloaded = fresh()
  await reloaded.initialize()
  assert.equal(reloaded.totalItems, 1)
})

test('IndexedDB request success followed by transaction abort never commits state', async (t) => {
  const { cart, storage } = setup(t)
  await cart.initialize()
  storage.failWrite = true
  const original = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (...args) {
    const request = original.apply(this, args)
    request.addEventListener('success', () => this.transaction.abort())
    return request
  }
  t.after(() => {
    IDBObjectStore.prototype.put = original
  })
  assert.equal(await cart.addItem(product()), false)
  assert.deepEqual(cart.items, [])
})

test('IndexedDB saving waits for transaction complete and state stays unchanged before commit', async (t) => {
  const { cart, storage } = setup(t)
  await cart.initialize()
  storage.failWrite = true
  const original = IDBDatabase.prototype.transaction
  let requestSucceeded = false
  let complete = false
  IDBDatabase.prototype.transaction = function (...args) {
    const tx = original.apply(this, args)
    tx.addEventListener('complete', () => {
      complete = true
    })
    const objectStore = tx.objectStore('snapshots')
    const put = objectStore.put.bind(objectStore)
    objectStore.put = (...putArgs) => {
      const request = put(...putArgs)
      request.addEventListener('success', () => {
        requestSucceeded = true
        assert.equal(complete, false)
        assert.deepEqual(cart.items, [])
      })
      return request
    }
    tx.objectStore = () => objectStore
    return tx
  }
  t.after(() => {
    IDBDatabase.prototype.transaction = original
  })
  assert.equal(await cart.addItem(product()), true)
  assert.equal(requestSucceeded, true)
  assert.equal(complete, true)
  assert.equal(cart.totalItems, 1)
})

test('a late failed transaction does not poison the next queued UI intent', async (t) => {
  const { cart, storage } = setup(t)
  await cart.addItem(product())
  storage.failWrite = true
  const original = IDBObjectStore.prototype.put
  let writes = 0
  IDBObjectStore.prototype.put = function (...args) {
    const request = original.apply(this, args)
    if (++writes === 1) request.addEventListener('success', () => this.transaction.abort())
    return request
  }
  t.after(() => {
    IDBObjectStore.prototype.put = original
  })
  const results = await Promise.all([cart.adjustQuantity(1, 1), cart.adjustQuantity(1, 1)])
  assert.deepEqual(results, [false, true])
  assert.equal(cart.totalItems, 2)
})

test('restored duplicate overflow skips that entry and preserves the preceding valid position', async (t) => {
  const { cart } = setup(
    t,
    JSON.stringify([
      entry(Number.MAX_SAFE_INTEGER),
      entry(1, product(1, 'Overflow')),
      entry(2, product(2)),
      entry(3, product(2, 'Latest')),
    ]),
  )
  await cart.initialize()
  assert.equal(cart.items[0].quantity, Number.MAX_SAFE_INTEGER)
  assert.equal(cart.items[0].product.title, 'Ring')
  assert.equal(cart.items[1].quantity, 5)
  assert.equal(cart.items[1].product.title, 'Latest')
  assert.equal(cart.isSidebarOpen, false)
})

test('blocked open settles without closing other connections; permanently hung open is bounded', async (t) => {
  const { cart, browser, fresh } = setup(t, JSON.stringify([entry()]))
  let pending
  browser.indexedDB = {
    open() {
      pending = {}
      setImmediate(() => pending.onblocked())
      return pending
    },
  }
  await cart.initialize()
  assert.equal(cart.totalItems, 1)
  assert.equal(await cart.addItem(product()), true)
  let lateClosed = false
  pending.result = {
    close() {
      lateClosed = true
    },
  }
  pending.onsuccess()
  assert.equal(lateClosed, true)
  browser.indexedDB = {
    open() {
      return {}
    },
  }
  const hung = fresh()
  const start = Date.now()
  await hung.initialize()
  assert.ok(Date.now() - start < 2500)
  assert.equal(hung.totalItems, 2)
})

test('every committed mutation posts the full snapshot, including the last removal', async (t) => {
  const { cart, posts } = setup(t, JSON.stringify([entry(2)]))
  await cart.initialize()
  assert.deepEqual(posts, [])
  await cart.addItem(product(2), 3)
  await cart.updateQuantity(1, 4)
  await cart.adjustQuantity(2, -1)
  await cart.removeItem(1)
  await cart.updateQuantity(2, 0)
  assert.deepEqual(
    posts.map(({ userId }) => userId),
    [1, 1, 1, 1, 1],
  )
  assert.deepEqual(
    posts.map(({ items }) => items.map(({ product, quantity }) => [product.id, quantity])),
    [
      [
        [1, 2],
        [2, 3],
      ],
      [
        [1, 4],
        [2, 3],
      ],
      [
        [1, 4],
        [2, 2],
      ],
      [[2, 2]],
      [],
    ],
  )
})

test('invalid intents and failed local persistence never post to the API', async (t) => {
  const { cart, posts, storage, browser } = setup(t)
  await cart.addItem(product(), -1)
  await cart.updateQuantity(1, NaN)
  await cart.adjustQuantity(1, -1)
  storage.failWrite = true
  browser.indexedDB = {
    open() {
      throw Error('unavailable')
    },
  }
  assert.equal(await cart.addItem(product()), false)
  assert.deepEqual(posts, [])
})

test('a failed POST preserves the local commit and error; the next intent sends the complete updated snapshot', async (t) => {
  const { cart, fresh, memory, posts } = setup(t)
  const workingPost = globalThis.cartPost
  globalThis.cartPost = async () => {
    throw Error('HTTP 503')
  }
  assert.equal(await cart.addItem(product()), true)
  assert.equal(cart.totalItems, 1)
  assert.equal(JSON.parse(memory.get('cart')).items[0].quantity, 1)
  const notification = useNotificationStore()
  assert.equal(notification.type, 'error')
  assert.equal(
    notification.message,
    'Your bag was saved on this device, but could not be sent to the server. Please try again.',
  )
  const reloaded = fresh()
  await reloaded.initialize()
  assert.equal(reloaded.totalItems, 1)
  assert.deepEqual(posts, [])
  globalThis.cartPost = workingPost
  assert.equal(await cart.addItem(product(2)), true)
  assert.deepEqual(
    posts[0].items.map(({ product }) => product.id),
    [1, 2],
  )
  assert.equal(notification.type, 'success')
  notification.hideNotification()
})

test('queued intents wait for each POST and recover after a rejected request', async (t) => {
  const { cart, memory } = setup(t)
  const requests = []
  let rejectFirst
  let started
  const firstStarted = new Promise((resolve) => {
    started = resolve
  })
  globalThis.cartPost = (userId, items) => {
    requests.push({ userId, items: JSON.parse(JSON.stringify(items)) })
    if (requests.length === 1) {
      started()
      return new Promise((resolve, reject) => {
        rejectFirst = reject
      })
    }
    return Promise.resolve({ id: 11 })
  }
  const first = cart.addItem(product())
  const second = cart.addItem(product(2))
  await firstStarted
  assert.equal(cart.totalItems, 1)
  assert.equal(JSON.parse(memory.get('cart')).items.length, 1)
  assert.equal(requests.length, 1)
  rejectFirst(Error('timeout'))
  assert.deepEqual(await Promise.all([first, second]), [true, true])
  assert.equal(requests.length, 2)
  assert.deepEqual(
    requests[1].items.map(({ product }) => product.id),
    [1, 2],
  )
  assert.equal(cart.totalItems, 2)
  useNotificationStore().hideNotification()
})
