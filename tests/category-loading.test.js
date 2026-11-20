import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick, reactive, ref, Suspense, watch } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      '#imports':
        'export const useRoute=()=>globalThis.categoryTest.route; export const useRouter=()=>globalThis.categoryTest.router; export const useIsMobile=()=>globalThis.categoryTest.isMobile',
      '~/composables/api/useApiFetch':
        'export const useApiFetch=(path, options)=>globalThis.categoryTest.fetch(path, options)',
      '~/stores/cartStore': 'export const useCartStore=()=>({addItem:async()=>{}})',
      '~/components/ProductFilter.vue': 'export default globalThis.categoryFilterComponent',
    }
    if (mocks[specifier])
      return {
        url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`,
        shortCircuit: true,
      }
    if (specifier.endsWith('.svg'))
      return {
        url: 'data:text/javascript,export default {render:()=>null}',
        shortCircuit: true,
      }
    if (specifier.startsWith('~/'))
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})

globalThis.categoryFilterComponent = await loadSfc(
  new URL('../components/ProductFilter.vue', import.meta.url),
)
const page = await loadSfc(new URL('../pages/products/index.vue', import.meta.url))
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}

async function setup(t, { productError = false, categoriesLoading = false } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/products', component: {} }],
  })
  await router.push('/products?category=rings&search=Ring&sortBy=price-minus&page=2&foreign=keep')
  const calls = { products: 0, categories: 0 }
  let finishCategories
  const categoryState = {
    data: ref(undefined),
    pending: ref(categoriesLoading),
    error: ref(categoriesLoading ? null : new Error('Categories unavailable')),
  }
  const productState = {
    data: ref(
      Array.from({ length: 12 }, (_, i) => ({ id: i + 1, title: `Ring ${i + 1}`, price: i + 1 })),
    ),
    pending: ref(false),
    status: ref(productError ? 'error' : 'success'),
    error: ref(productError ? new Error('Products unavailable') : null),
  }
  const categoryRequest = () =>
    new Promise((resolve) => {
      finishCategories = (categories, error = null) => {
        categoryState.data.value = error ? undefined : categories
        categoryState.error.value = error
        categoryState.pending.value = false
        resolve()
      }
    })
  const initialCategories = categoriesLoading ? categoryRequest() : Promise.resolve()
  globalThis.categoryTest = {
    router,
    route: reactive({
      get query() {
        return router.currentRoute.value.query
      },
      get fullPath() {
        return router.currentRoute.value.fullPath
      },
      path: '/products',
      hash: '',
    }),
    isMobile: ref(false),
    fetch(path, options) {
      if (path === '/products/categories') {
        calls.categories++
        return Object.assign(initialCategories, categoryState, {
          refresh: () => {
            calls.categories++
            categoryState.pending.value = true
            return categoryRequest()
          },
        })
      }
      calls.products++
      watch(options.params, () => calls.products++)
      return Object.assign(Promise.resolve(), productState, {
        refresh: async () => calls.products++,
      })
    },
  }
  globalThis.document = { body: { style: { overflow: '' } } }
  const view = mountComponent(
    t,
    { render: () => h(Suspense, null, { default: () => h(page) }) },
    {
      components: {
        ProductCardList: {
          props: ['products'],
          setup: (props) => () => h('article', props.products.map((item) => item.title).join(', ')),
        },
        BasePagination: {
          props: ['currentPage'],
          setup: (props) => () => h('nav', { 'data-page': props.currentPage }),
        },
        BaseButton: {
          setup:
            (_, { slots, attrs }) =>
            () =>
              h('button', attrs, slots.default?.()),
        },
      },
    },
  )
  t.after(() => {
    view.unmount()
    delete globalThis.categoryTest
    delete globalThis.document
  })
  await settle()
  return { ...view, router, calls, categoryState, complete: (...args) => finishCategories(...args) }
}

const retry = (view) =>
  view.find((node) => node.props.class === 'product-filters__categories-retry')
const category = (view) => view.find((node) => node.props['aria-label'] === 'Category')

test('category failure and retries preserve products, applied filters, draft, page and URL', async (t) => {
  const view = await setup(t)
  const beforeUrl = view.router.currentRoute.value.fullPath
  const beforeProducts = view.find((node) => node.type === 'article').text
  const search = view.find((node) => node.props['aria-label'] === 'Search products')
  search.props.onInput({ target: { value: 'Unapplied draft' } })
  await nextTick()
  const assertCatalogUnchanged = () => {
    assert.equal(view.router.currentRoute.value.fullPath, beforeUrl)
    assert.equal(view.find((node) => node.type === 'article').text, beforeProducts)
    assert.equal(search.props.value, 'Unapplied draft')
    assert.equal(category(view).props.value, 'rings')
    assert.equal(
      view.find((node) => node.props['aria-label'] === 'Sort products').props.value,
      'price-minus',
    )
    assert.equal(view.find((node) => node.type === 'nav').props['data-page'], 2)
    assert.equal(view.calls.products, 1)
  }
  assert.match(view.text(), /Unable to load categories/)
  assert.equal(category(view).props.disabled, true)
  assert.equal(
    view.find((node) => node.type === 'option' && node.props.value === 'rings').props.selected,
    '',
  )
  assertCatalogUnchanged()

  const retryButton = retry(view)
  const firstRetry = retryButton.props.onClick()
  retryButton.props.onClick()
  await nextTick()
  assert.equal(view.calls.categories, 2, 'duplicate retry does not start another request')
  assert.match(view.text(), /Loading categories/)
  assert.equal(retry(view).props.disabled, true)
  assertCatalogUnchanged()
  view.complete(undefined, new Error('Still unavailable'))
  await firstRetry
  await settle()
  assert.match(view.text(), /Unable to load categories/)
  assert.equal(retry(view).props.disabled, false)
  assertCatalogUnchanged()

  const secondRetry = retry(view).props.onClick()
  view.complete(['rings', 'chains'])
  await secondRetry
  await settle()
  assert.doesNotMatch(view.text(), /Unable to load categories|Loading categories/)
  assert.equal(retry(view), undefined)
  assert.equal(category(view).props.disabled, false)
  assert.equal(view.all((node) => node.type === 'option' && node.props.value === 'rings').length, 1)
  assert.match(view.text(), /chains/)
  assertCatalogUnchanged()
})

test('pending categories do not delay independent product rendering and successful empty lists clear feedback', async (t) => {
  const view = await setup(t, { categoriesLoading: true })
  assert.match(view.text(), /Ring 7/)
  assert.match(view.text(), /Loading categories/)
  assert.doesNotMatch(view.text(), /Unable to load categories/)
  assert.equal(retry(view), undefined)
  assert.equal(category(view).props.disabled, true)
  view.complete([])
  await settle()
  assert.doesNotMatch(view.text(), /Loading categories|Unable to load categories/)
  assert.equal(category(view).props.disabled, false)
  assert.equal(view.calls.products, 1)
  assert.equal(view.router.currentRoute.value.query.category, 'rings')
})

test('category recovery remains available when the independent product request failed', async (t) => {
  const view = await setup(t, { productError: true })
  assert.match(view.text(), /Unable to load products/)
  assert.match(view.text(), /Unable to load categories/)
  const recovery = retry(view).props.onClick()
  view.complete([])
  await recovery
  await settle()
  assert.match(view.text(), /Unable to load products/)
  assert.doesNotMatch(view.text(), /Unable to load categories/)
  assert.equal(view.calls.products, 1)
})
