import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  createHydrationRenderer,
  createSSRApp,
  effectScope,
  h,
  hasInjectionContext,
  inject,
  nextTick,
  onMounted,
  reactive,
  ref,
  Suspense,
  watch,
  withAsyncContext,
} from 'vue'
import { renderToString } from '@vue/server-renderer'

const nuxtPageURL = new URL('../node_modules/nuxt/dist/pages/runtime/page.js', import.meta.url).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === '#catalog-router' ||
      (specifier === 'vue-router' && context.parentURL?.startsWith('data:'))
    )
      return nextResolve('vue-router', { ...context, parentURL: nuxtPageURL })
    if (specifier === '#app/nuxt')
      return {
        url: 'data:text/javascript,export const useNuxtApp = () => globalThis.catalogTest.nuxt',
        shortCircuit: true,
      }
    if (specifier === '#app/composables/router')
      return {
        url: 'data:text/javascript,export const useRouter = () => globalThis.catalogTest.router',
        shortCircuit: true,
      }
    if (specifier === '#build/nuxt.config.mjs')
      return {
        url: 'data:text/javascript,export const appKeepalive = false; export const appPageTransition = false',
        shortCircuit: true,
      }
    if (specifier === '#build/pages')
      return {
        url: 'data:text/javascript,export { START_LOCATION } from "vue-router"',
        shortCircuit: true,
      }
    if (specifier.startsWith('#app/'))
      return {
        url: new URL(`../node_modules/nuxt/dist/app/${specifier.slice(5)}.js`, import.meta.url)
          .href,
        shortCircuit: true,
      }
    if (specifier === '#imports') {
      return {
        url: 'data:text/javascript,export const useRoute = () => globalThis.catalogInjectedRoute(); export const useRouter = () => globalThis.catalogTest.router',
        shortCircuit: true,
      }
    }
    if (specifier === '~/composables/api/products/useGetProducts') {
      return {
        url: 'data:text/javascript,export const useGetProducts = (options) => globalThis.catalogTest.fetch(options)',
        shortCircuit: true,
      }
    }
    if (specifier.startsWith('~/')) {
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      }
    }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
  load(url, context, nextLoad) {
    if (url.includes('/nuxt/dist/') && url.endsWith('.js'))
      return {
        format: 'module',
        source: readFileSync(fileURLToPath(url), 'utf8')
          .replaceAll('import.meta.client', 'true')
          .replaceAll('import.meta.server', 'false'),
        shortCircuit: true,
      }
    if (url.endsWith('.ts')) {
      return {
        format: 'module',
        source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), 'utf8'), {
          mode: 'transform',
        }),
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})
const { createMemoryHistory, createRouter } = await import('#catalog-router')
const { default: nuxtPage } = await import(nuxtPageURL)
const { PageRouteSymbol: pageRouteSymbol } =
  await import('../node_modules/nuxt/dist/app/components/injections.js')
globalThis.catalogInjectedRoute = () =>
  hasInjectionContext()
    ? inject(pageRouteSymbol, globalThis.catalogTest.route)
    : globalThis.catalogTest.route
const { useRoutedProductCatalog: useProductCatalog } =
  await import('../composables/useRoutedProductCatalog.ts')
const items = (count, category = 'all') =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Item ${String(i + 1).padStart(2, '0')}`,
    price: count - i,
    category,
    description: '',
  }))
const settle = async () => {
  for (let i = 0; i < 12; i++) await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function setup(t, url, initial = items(20)) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/products', component: {} }],
  })
  await router.push(url)
  const data = ref(initial)
  const pending = ref(false)
  const status = ref('success')
  const error = ref(null)
  const scope = effectScope()
  globalThis.catalogTest = {
    router,
    route: reactive({
      get query() {
        return router.currentRoute.value.query
      },
      get fullPath() {
        return router.currentRoute.value.fullPath
      },
      get path() {
        return router.currentRoute.value.path
      },
      get hash() {
        return router.currentRoute.value.hash
      },
    }),
    fetch: ({ category }) => {
      watch(category, () => {
        pending.value = true
        status.value = 'pending'
      })
      return Object.assign(Promise.resolve(), {
        data,
        pending,
        status,
        error,
        refresh: async () => {
          error.value = null
          status.value = 'success'
        },
      })
    },
  }
  const catalog = await scope.run(() => useProductCatalog())
  t.after(() => {
    scope.stop()
    delete globalThis.catalogTest
  })
  await settle()
  return { catalog, router, data, pending, status, error, dispose: () => scope.stop() }
}

test('retry reloads a failed catalog without losing the applied URL filters', async (t) => {
  const { catalog, error, status, router } = await setup(
    t,
    '/products?search=Item&category=jewelery&sortBy=price-minus',
  )
  error.value = new Error('Temporary failure')
  status.value = 'error'
  await settle()
  const before = router.currentRoute.value.fullPath
  await catalog.retry()
  await settle()
  assert.equal(error.value, null)
  assert.equal(status.value, 'success')
  assert.equal(router.currentRoute.value.fullPath, before)
  assert.equal(catalog.products.value.length, 6)
})

test('direct URL, filter/page resets, quick intents and history restore all applied fields', async (t) => {
  const { catalog: c, router } = await setup(
    t,
    '/products?page=2&search=Item&category=all&sortBy=price-minus&foreign=keep&onSale=true',
  )
  assert.equal(c.currentPage.value, 2)
  assert.equal(c.searchDraft.value, 'Item')
  assert.equal(c.products.value[0].price, 7)
  c.setSort('price-plus')
  c.setCategory('jewelery')
  await settle()
  assert.equal(router.currentRoute.value.query.sortBy, 'price-plus')
  assert.equal(c.filters.value.category, 'jewelery')
  assert.equal(c.currentPage.value, 1)
  assert.equal(router.currentRoute.value.query.foreign, 'keep')
  assert.equal(router.currentRoute.value.query.onSale, 'true')
  router.back()
  await settle()
  assert.equal(c.filters.value.category, 'all')
  assert.equal(c.filters.value.sortBy, 'price-minus')
  assert.equal(c.currentPage.value, 2)
  router.forward()
  await settle()
  assert.equal(c.filters.value.sortBy, 'price-plus')
})

test('search debounces, replaces history, preserves draft on own intents and cancels on Back', async (t) => {
  const { catalog: c, router } = await setup(t, '/products?search=Item')
  c.changePage(2)
  await settle()
  c.setSearch('Item 02')
  c.setSort('price-minus')
  await settle()
  assert.equal(c.searchDraft.value, 'Item 02')
  assert.equal(c.filters.value.search, 'Item')
  await wait(540)
  await settle()
  assert.equal(c.filters.value.search, 'Item 02')
  assert.equal(c.products.value.length, 1)
  assert.equal(c.currentPage.value, 1)
  router.back()
  await settle()
  assert.equal(c.filters.value.search, 'Item')
  assert.equal(c.currentPage.value, 2)
  c.setSearch('stale')
  router.back()
  await settle()
  assert.equal(c.searchDraft.value, 'Item')
  await wait(540)
  assert.equal(router.currentRoute.value.query.search, 'Item')
  assert.equal(c.currentPage.value, 1)
})

test('invalid pages and sort normalize with replace and repeated queries read first value', async (t) => {
  const { catalog: c, router } = await setup(
    t,
    '/products?page=-2&sortBy=unknown&search=Item&search=ignored&foreign=x',
  )
  assert.equal(c.currentPage.value, 1)
  assert.equal(c.filters.value.sortBy, '')
  assert.equal(router.currentRoute.value.query.sortBy, undefined)
  assert.deepEqual(router.currentRoute.value.query.search, ['Item', 'ignored'])
  assert.equal(router.currentRoute.value.query.foreign, 'x')
  for (const page of ['nope', '1.5', '0', '']) {
    await router.push({ query: { page } })
    await settle()
    assert.equal(router.currentRoute.value.query.page, '1')
  }
  await router.push({ query: { page: '2', search: 'missing' } })
  await settle()
  assert.equal(c.currentPage.value, 1)
  assert.equal(c.totalPages.value, 0)
  assert.deepEqual(c.visiblePages.value, [])
})

test('upper page clamp waits for successful data matching the new category', async (t) => {
  const {
    catalog: c,
    router,
    data,
    pending,
    status,
    error,
  } = await setup(t, '/products?page=99', items(2))
  assert.equal(c.currentPage.value, 1)
  await router.push('/products?category=new&page=3')
  await settle()
  assert.equal(c.currentPage.value, 3)
  data.value = items(2, 'new')
  await settle()
  assert.equal(c.currentPage.value, 3)
  error.value = new Error('network')
  pending.value = false
  status.value = 'error'
  await settle()
  assert.equal(c.currentPage.value, 3)
  error.value = null
  status.value = 'success'
  await settle()
  assert.equal(c.currentPage.value, 1)
})

test('no-op intents add no navigation and disposal cancels pending search', async (t) => {
  const { catalog: c, router, dispose } = await setup(t, '/products')
  let navigations = 0
  router.afterEach(() => {
    navigations++
  })
  c.changePage(1)
  c.setCategory('')
  c.setSort('')
  c.setSearch('')
  await wait(540)
  assert.equal(navigations, 0)
  c.setSearch('discarded')
  dispose()
  await wait(540)
  assert.equal(navigations, 0)
  assert.equal(router.currentRoute.value.query.search, undefined)
})

test('SSR renders the bounded page and canonicalizes URL after an awaited initial fetch', async (t) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/products', component: {} }],
  })
  await router.push('/products?page=999&foreign=keep')
  const data = ref(undefined)
  const pending = ref(true)
  const status = ref('pending')
  const error = ref(null)
  globalThis.catalogTest = {
    router,
    route: { ...router.currentRoute.value },
    fetch: () =>
      Object.assign(
        new Promise((resolve) => {
          setImmediate(() => {
            data.value = items(20)
            pending.value = false
            status.value = 'success'
            resolve()
          })
        }),
        { data, pending, status, error },
      ),
  }
  t.after(() => {
    delete globalThis.catalogTest
  })
  const app = createSSRApp({
    async setup() {
      const catalog = await useProductCatalog()
      return () =>
        h(
          'main',
          { 'data-page': catalog.currentPage.value },
          catalog.products.value.map((product) => h('article', product.title)),
        )
    },
  })
  const html = await renderToString(app)
  assert.match(html, /data-page="4"/)
  assert.equal((html.match(/<article>/g) || []).length, 2)
  assert.match(html, /Item 19/)
  assert.match(html, /Item 20/)
  assert.equal(router.currentRoute.value.query.page, '4')
  assert.equal(router.currentRoute.value.query.foreign, 'keep')
})

test('initial canonicalization lets async page mount through Nuxt RouteProvider and Suspense', async (t) => {
  const node = (type) => ({
    type,
    children: [],
    parent: null,
    nodeType: 1,
    tagName: type.toUpperCase(),
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    get parentNode() {
      return this.parent
    },
    get firstChild() {
      return this.children[0] || null
    },
    hasChildNodes() {
      return this.children.length > 0
    },
    hasAttribute() {
      return false
    },
    getAttribute() {
      return null
    },
  })
  globalThis.document = { createElement: node }
  globalThis.SVGElement = class {}
  globalThis.HTMLElement = class {}
  const renderer = createHydrationRenderer({
    createElement: node,
    createText: node,
    createComment: node,
    setText() {},
    setElementText() {},
    patchProp(el, key, _old, value) {
      el[key] = value
    },
    parentNode: (el) => el.parent,
    nextSibling: (el) => el.parent?.children[el.parent.children.indexOf(el) + 1] || null,
    insert(el, parent, anchor = null) {
      if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
      el.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, el)
    },
    remove(el) {
      if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
      el.parent = null
    },
  })
  let mounted = false
  let catalog
  const page = {
    async setup() {
      onMounted(() => {
        mounted = true
      })
      const [categories, restore] = withAsyncContext(() => Promise.resolve([]))
      await categories
      restore()
      catalog = await useProductCatalog()
      const expanded = ref(false)
      return () =>
        h('button', {
          onClick: () => {
            expanded.value = !expanded.value
          },
          expanded: expanded.value,
        })
    },
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/products', component: page }],
  })
  await router.push('/products?page=999&foreign=keep')
  let replacements = 0
  const replace = router.replace.bind(router)
  router.replace = (target) => {
    replacements++
    if (replacements > 10) return new Promise(() => {})
    return replace(target)
  }
  globalThis.catalogTest = {
    router,
    nuxt: {
      isHydrating: true,
      deferHydration() {
        return () => {
          this.isHydrating = false
        }
      },
      hooks: { hookOnce: () => () => {} },
      callHook: () => Promise.resolve(),
    },
    route: router.currentRoute.value,
    fetch: () =>
      Object.assign(Promise.resolve(), {
        data: ref(items(20)),
        pending: ref(false),
        status: ref('success'),
        error: ref(null),
      }),
  }
  const app = renderer.createApp({
    setup: () => () => h(Suspense, null, { default: () => h(nuxtPage) }),
  })
  app.use(router)
  const root = node('root')
  const serverButton = node('button')
  serverButton.parent = root
  root.children.push(serverButton)
  app.mount(root, true)
  t.after(() => {
    app.unmount()
    delete globalThis.catalogTest
    delete globalThis.document
    delete globalThis.SVGElement
    delete globalThis.HTMLElement
  })
  await settle()
  assert.equal(mounted, true, `page mounted after URL normalization (${replacements} replacements)`)
  assert.equal(globalThis.catalogTest.nuxt.isHydrating, false, 'Nuxt hydration finished')
  assert.equal(replacements, 1, 'canonicalization replaces exactly once')
  assert.equal(router.currentRoute.value.query.page, '4')
  assert.equal(router.currentRoute.value.query.foreign, 'keep')
  assert.equal(catalog.products.value.length, 2)
  const button = root.children.find((el) => el.type === 'button')
  button.onClick()
  await nextTick()
  assert.equal(button.expanded, true, 'Filters-equivalent handler responds after mount')
  catalog.changePage(3)
  await settle()
  assert.equal(router.currentRoute.value.query.page, '3')
  assert.equal(catalog.currentPage.value, 3)
  assert.equal(catalog.products.value[0].id, 13)
  assert.equal(catalog.products.value.length, 6)
})

test('quick category and page reversals retain the latest intent while navigation is pending', async (t) => {
  const { catalog: c, router } = await setup(t, '/products?page=1')
  c.setCategory('new')
  c.setCategory('')
  await settle()
  assert.equal(router.currentRoute.value.query.category, undefined)
  assert.equal(c.filters.value.category, '')
  assert.equal(c.currentPage.value, 1)
  c.changePage(2)
  c.changePage(1)
  await settle()
  assert.equal(router.currentRoute.value.query.page, '1')
  assert.equal(c.currentPage.value, 1)
})

test('repeated pending page targets preserve the search draft and its debounce', async (t) => {
  const { catalog: c, router } = await setup(t, '/products?page=1')
  c.setSearch('Item 02')
  c.changePage(2)
  c.changePage(3)
  c.changePage(2)
  await settle()
  assert.equal(router.currentRoute.value.query.page, '2')
  assert.equal(c.searchDraft.value, 'Item 02')
  assert.equal(c.filters.value.search, '')
  await wait(540)
  await settle()
  assert.equal(router.currentRoute.value.query.search, 'Item 02')
  assert.equal(c.currentPage.value, 1)
  assert.deepEqual(
    c.products.value.map((product) => product.id),
    [2],
  )
})
