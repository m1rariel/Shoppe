import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { effectScope, ref, onScopeDispose, nextTick } from 'vue'
import './helpers/sfc-runtime.js'

const nuxtRoot = new URL('../node_modules/nuxt/dist/app/', import.meta.url)
const mock = (source) => ({
  url: `data:text/javascript,${encodeURIComponent(source)}`,
  shortCircuit: true,
})
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '#build/nuxt.config.mjs')
      return mock(
        'export const alwaysRunFetchOnKeyChange=false,fetchDefaults={},granularCachedData=false,pendingWhenIdle=false,purgeCachedData=true,resetAsyncDataToUndefined=true,asyncDataDefaults={value:undefined,errorValue:undefined,deep:false};',
      )
    if (specifier === 'nuxt/app')
      return mock(
        'export const useFetch=(...args)=>globalThis.lifecycleFetch(...args);export const useCookie=()=>({value:"amigo"});export const useRuntimeConfig=()=>({public:{apiBaseUrl:"https://fixture.test"}});',
      )
    if (specifier === '~/stores/cartStore')
      return mock('export const useCartStore=()=>({addItem:async()=>true})')
    if (specifier.endsWith('nuxt.js'))
      return mock('export const useNuxtApp=()=>globalThis.lifecycleApp')
    if (specifier === './ssr.js') return mock('export const useRequestFetch=()=>globalThis.$fetch')
    if (specifier.endsWith('client-only.js')) return mock('export const clientOnlySymbol=Symbol()')
    if (specifier === './error.js') return mock('export const createError=e=>e')
    if (specifier === './ready.js') return mock('export const onNuxtReady=fn=>fn()')
    if (specifier.startsWith('~/'))
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.startsWith(nuxtRoot.href))
      return {
        format: 'module',
        source: readFileSync(new URL(url), 'utf8')
          .replaceAll('import.meta.client', 'true')
          .replaceAll('import.meta.server', 'false')
          .replaceAll('import.meta.dev', 'false')
          .replaceAll('import.meta.prerender', 'false'),
        shortCircuit: true,
      }
    return next(url, context)
  },
})
const { useFetch } = await import(new URL('composables/fetch.js', nuxtRoot))
const { useGetProducts } = await import('../composables/api/products/useGetProducts.ts')
const { useSimilarProducts } = await import('../composables/useSimilarProducts.ts')
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10))
  await nextTick()
}

test('unmounting detail after catalog starts cannot clear the catalog response through a shared key', async (t) => {
  globalThis.lifecycleApp = {
    _asyncData: {},
    _asyncDataPromises: {},
    payload: { data: {}, _errors: {}, serverRendered: false },
    static: { data: {} },
    isHydrating: false,
    hook: () => () => {},
    runWithContext: (fn) => fn(),
  }
  globalThis.lifecycleFetch = useFetch
  const requests = []
  globalThis.$fetch = (url, options) =>
    new Promise((resolve, reject) => {
      requests.push({ category: options.params.category, resolve })
      options.signal.addEventListener('abort', () => reject(new Error('Aborted')))
    })
  const detailScope = effectScope()
  const returningDetailScope = effectScope()
  const catalogScope = effectScope()
  t.after(() => {
    detailScope.stop()
    returningDetailScope.stop()
    catalogScope.stop()
    delete globalThis.lifecycleApp
    delete globalThis.lifecycleFetch
    delete globalThis.$fetch
  })
  detailScope.run(() => {
    const product = ref({ id: 3024, category: 'chains' })
    onScopeDispose(() => {
      product.value = undefined
    })
    useSimilarProducts(product)
  })
  requests[0].resolve([{ id: 3024, category: 'chains' }])
  await settle()
  let catalog
  catalogScope.run(() => {
    catalog = useGetProducts()
  })
  assert.equal(requests.at(-1).category, undefined)
  detailScope.stop()
  requests.at(-1).resolve([{ id: 3288, title: 'Catalog ring', category: 'rings' }])
  await settle()
  assert.equal(catalog.status.value, 'success')
  assert.deepEqual(catalog.data.value, [{ id: 3288, title: 'Catalog ring', category: 'rings' }])
  const returningProduct = ref({ id: 3024, category: 'chains' })
  let returningSimilar
  returningDetailScope.run(() => {
    returningSimilar = useSimilarProducts(returningProduct)
  })
  assert.equal(requests.at(-1).category, 'chains', 'returning detail must request its category')
  const delayedChains = requests.at(-1)
  returningProduct.value = { id: 3288, category: 'rings' }
  await settle()
  assert.equal(requests.at(-1).category, 'rings')
  requests.at(-1).resolve([
    { id: 3288, category: 'rings' },
    { id: 3289, category: 'rings' },
  ])
  await settle()
  delayedChains.resolve([{ id: 3025, category: 'chains' }])
  await settle()
  assert.deepEqual(returningSimilar.products.value, [{ id: 3289, category: 'rings' }])
})
