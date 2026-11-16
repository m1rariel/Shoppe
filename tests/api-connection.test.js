import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { ref } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      'nuxt/app': `export const useCookie=()=>globalThis.connectionTest.token;
        export const useRuntimeConfig=()=>globalThis.connectionTest.config;
        export const useFetch=(...args)=>globalThis.connectionTest.read(...args)`,
      ofetch: 'export const $fetch=(...args)=>globalThis.connectionTest.write(...args)',
    }
    if (mocks[specifier])
      return {
        url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`,
        shortCircuit: true,
      }
    if (specifier === '~/utils/apiConnection')
      return { url: new URL('../utils/apiConnection.ts', import.meta.url).href, shortCircuit: true }
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
const { useApiFetch } = await import('../composables/api/useApiFetch.ts')
const { useAddNewCart } = await import('../composables/api/carts/useAddNewCart.ts')

function setup(t) {
  const reads = []
  const writes = []
  const state = {
    config: { public: { apiBaseUrl: 'https://api.example.test' } },
    token: ref(null),
    read: (...args) => {
      reads.push(args)
      return args[1]
    },
    write: async (...args) => {
      writes.push(args)
      return { id: 1 }
    },
  }
  globalThis.connectionTest = state
  t.after(() => delete globalThis.connectionTest)
  return { state, reads, writes }
}

test('both adapters share URL and headers while preserving their cookie timing', async (t) => {
  const { state, writes } = setup(t)
  const read = useApiFetch('/products')
  const post = useAddNewCart()
  assert.equal(read.baseURL, state.config.public.apiBaseUrl)
  assert.deepEqual(read.headers, { 'Content-Type': 'application/json', Authorization: 'amigo' })
  assert.equal(writes.length, 0)
  await post(1, [])
  assert.deepEqual(writes[0][1].headers, read.headers)
  assert.equal(writes[0][1].baseURL, read.baseURL)

  state.token.value = 'first-token'
  const authenticatedRead = useApiFetch('/products')
  state.token.value = 'second-token'
  await post(1, [])
  assert.equal(authenticatedRead.headers.Authorization, 'Bearer first-token')
  assert.equal(writes[1][1].headers.Authorization, 'Bearer second-token')
  state.token.value = ''
  await post(1, [])
  assert.equal(writes[2][1].headers.Authorization, 'amigo')
  assert.equal(read.headers.Authorization, 'amigo')
})

test('both adapters reject missing configuration before invoking transport; read accepts its own URL', (t) => {
  const { state, reads, writes } = setup(t)
  for (const missing of ['', undefined]) {
    state.config.public.apiBaseUrl = missing
    assert.throws(() => useApiFetch('/products'), { message: 'API_BASE_URL is not set' })
    assert.throws(useAddNewCart, { message: 'API_BASE_URL is not set' })
    assert.throws(() => useApiFetch('/products', { baseURL: '' }), /API_BASE_URL is not set/)
  }
  assert.equal(reads.length, 0)
  assert.equal(writes.length, 0)
  assert.equal(
    useApiFetch('/products', { baseURL: 'https://override.test' }).baseURL,
    'https://override.test',
  )
})

test('read keeps full replacements including empty and explicit undefined overrides', (t) => {
  setup(t)
  const headers = { 'X-Only': 'custom' }
  const key = ref('custom-key')
  const options = useApiFetch('/products', { baseURL: 'https://override.test', headers, key })
  assert.equal(options.baseURL, 'https://override.test')
  assert.equal(options.headers, headers)
  assert.equal(options.key, key)
  assert.deepEqual(useApiFetch('/products', { headers: {} }).headers, {})
  assert.equal(useApiFetch('/products', { baseURL: '' }).baseURL, '')
  const empty = useApiFetch('/products', { baseURL: undefined, headers: undefined, key: undefined })
  assert.equal(empty.baseURL, undefined)
  assert.equal(empty.headers, undefined)
  assert.equal(empty.key, undefined)
})

test('read passes reactive request/options intact and keeps default cache key reactive', (t) => {
  const { reads } = setup(t)
  const request = ref('/products/1')
  const params = ref({ page: 1 })
  const options = useApiFetch(request, { params })
  assert.equal(reads[0][0], request)
  assert.equal(options.params, params)
  assert.equal(options.key.value, '/products/1{"page":1}')
  request.value = '/products/2'
  params.value = { page: 2 }
  assert.equal(options.key.value, '/products/2{"page":2}')
  assert.equal(
    useApiFetch(() => request.value, { params: () => params.value }).key.value,
    options.key.value,
  )
  assert.equal(useApiFetch('/products').key.value, '/products{}')
  const baseURL = ref('https://reactive.test')
  assert.equal(useApiFetch(request, { baseURL }).baseURL, baseURL)
  const getter = () => baseURL.value
  assert.equal(useApiFetch(request, { baseURL: getter }).baseURL, getter)
  baseURL.value = undefined
  assert.equal(useApiFetch(request, { baseURL }).baseURL, baseURL)
  assert.equal(useApiFetch(request, { baseURL: getter }).baseURL, getter)
})

test('both adapters propagate transport failures without additional attempts', async (t) => {
  const { state } = setup(t)
  const error = new Error('Transport unavailable')
  let reads = 0
  let writes = 0
  state.read = () => {
    reads++
    throw error
  }
  state.write = async () => {
    writes++
    throw error
  }
  assert.throws(
    () => useApiFetch('/products'),
    (caught) => caught === error,
  )
  await assert.rejects(useAddNewCart()(1, []), (caught) => caught === error)
  assert.equal(reads, 1)
  assert.equal(writes, 1)
})
