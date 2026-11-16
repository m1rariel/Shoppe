import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '~/utils/apiConnection')
      return {
        url: new URL('../utils/apiConnection.ts', import.meta.url).href,
        shortCircuit: true,
      }
    const mocks = {
      'nuxt/app':
        'export const useCookie=()=>globalThis.cartApi.token; export const useRuntimeConfig=()=>globalThis.cartApi.config',
      ofetch: 'export const $fetch=(...args)=>globalThis.cartApi.fetch(...args)',
    }
    if (mocks[specifier])
      return {
        url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`,
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
const { useAddNewCart } = await import('../composables/api/carts/useAddNewCart.ts')

function setup(t) {
  const requests = []
  const response = { id: 11 }
  globalThis.cartApi = {
    token: { value: null },
    config: { public: { apiBaseUrl: 'https://cart.example.test' } },
    fetch: async (...args) => {
      requests.push(args)
      return response
    },
  }
  t.after(() => delete globalThis.cartApi)
  return { requests, response, state: globalThis.cartApi }
}

test('cart POST sends a copied complete product snapshot with configured URL and bounded single attempt', async (t) => {
  const { requests, response } = setup(t)
  const postCart = useAddNewCart()
  assert.deepEqual(requests, [])
  const items = [
    { product: { id: 5, title: 'Ring', price: 10 }, quantity: 1 },
    { product: { id: 1, title: 'Other', price: 20 }, quantity: 5 },
  ]
  assert.equal(await postCart(1, items), response)
  items[0].quantity = 9
  const [url, options] = requests[0]
  assert.equal(url, '/carts')
  assert.equal(options.method, 'POST')
  assert.equal(options.baseURL, 'https://cart.example.test')
  assert.deepEqual(options.headers, { 'Content-Type': 'application/json', Authorization: 'amigo' })
  assert.deepEqual(options.body, {
    userId: 1,
    date: new Date().toISOString().slice(0, 10),
    products: [
      { productId: 5, quantity: 1 },
      { productId: 1, quantity: 5 },
    ],
  })
  assert.equal(options.retry, 0)
  assert.equal(options.timeout, 10000)
})

test('cart POST includes the current cookie token and sends an empty snapshot', async (t) => {
  const { state, requests } = setup(t)
  const postCart = useAddNewCart()
  state.token.value = 'updated-token'
  await postCart(5, [])
  assert.equal(requests[0][1].headers.Authorization, 'Bearer updated-token')
  assert.deepEqual(requests[0][1].body.products, [])
  assert.equal(requests[0][1].body.userId, 5)
})

test('cart POST propagates request errors and rejects missing API configuration', async (t) => {
  const { state, requests } = setup(t)
  const postCart = useAddNewCart()
  const error = new Error('Network unavailable')
  state.fetch = async () => {
    throw error
  }
  await assert.rejects(postCart(1, []), (caught) => caught === error)
  state.config.public.apiBaseUrl = ''
  assert.throws(useAddNewCart, /API_BASE_URL is not set/)
  assert.deepEqual(requests, [])
})
