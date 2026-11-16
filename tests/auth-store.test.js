import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { createPinia, setActivePinia } from 'pinia'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'nuxt/app')
      return {
        url: 'data:text/javascript,export const useCookie = (...args) => globalThis.authMocks.cookie(...args); export const refreshCookie = (name) => globalThis.authMocks.refreshes.push(name); export const useRuntimeConfig = () => ({public:{apiBaseUrl:"https://api.example"}})',
        shortCircuit: true,
      }
    if (specifier === '~/utils/apiConnection')
      return {
        url: new URL('../utils/apiConnection.ts', import.meta.url).href,
        shortCircuit: true,
      }
    return nextResolve(specifier, context)
  },
})
const { useAuthStore } = await import('../stores/auth.js')

function setup(t, token = null) {
  const cookie = ref(token)
  const options = []
  const writes = []
  const refreshes = []
  const client = () => {
    globalThis.document = {
      set cookie(value) {
        writes.push(value)
        const token = value.split(';')[0].slice('authToken='.length)
        cookie.value = value.includes('Max-Age=0') ? null : decodeURIComponent(token)
      },
    }
  }
  globalThis.authMocks = {
    refreshes,
    cookie: (name, config) => {
      options.push({ name, config })
      return cookie
    },
  }
  setActivePinia(createPinia())
  t.after(() => {
    delete globalThis.authMocks
    delete globalThis.$fetch
    delete globalThis.document
  })
  return { cookie, options, writes, refreshes, client, store: useAuthStore() }
}

test('SSR restores only token from cookie and logout removes persisted auth', async (t) => {
  const { store, cookie, options } = setup(t, 'persisted-token')
  const app = createSSRApp({
    render: () => h('span', store.isAuthenticated ? 'Signed in' : 'Guest'),
  })
  assert.equal(await renderToString(app), '<span>Signed in</span>')
  assert.deepEqual(store.$state, { user: 'persisted-token' })
  assert.equal(options[0].config.maxAge, undefined)
  assert.equal(options[0].config.expires, undefined)
  assert.equal(options[0].config.readonly, true)
  assert.equal(options[0].config.watch, false)
  assert.equal(options[0].config.path, '/')
  store.logout()
  assert.equal(store.user, null)
  assert.equal(store.isAuthenticated, false)
  assert.equal(cookie.value, null)
})

test('login uses configured API and exact password, persists response token without credentials', async (t) => {
  const { store, cookie } = setup(t)
  let request
  globalThis.$fetch = async (...args) => {
    request = args
    return { token: 'new-token' }
  }
  await store.login('username', ' password ')
  assert.equal(request[0], '/auth/login')
  assert.equal(request[1].baseURL, 'https://api.example')
  assert.equal(request[1].method, 'POST')
  assert.deepEqual(request[1].headers, {
    'Content-Type': 'application/json',
    Authorization: 'amigo',
  })
  assert.deepEqual(request[1].body, { username: 'username', password: ' password ' })
  assert.deepEqual(store.$state, { user: 'new-token' })
  assert.equal(cookie.value, 'new-token')
  assert.equal(store.isAuthenticated, true)
})

test('failed, malformed and cancelled logins never write auth state', async (t) => {
  const { store, cookie, writes, refreshes, client } = setup(t)
  client()
  globalThis.$fetch = async () => {
    throw new Error('Network unavailable')
  }
  await assert.rejects(store.login('user', 'pass', undefined, true), /Network/)
  globalThis.$fetch = async () => ({ token: '' })
  await assert.rejects(store.login('user', 'pass', undefined, true), /invalid login response/)
  const controller = new AbortController()
  globalThis.$fetch = async () => {
    controller.abort()
    return { token: 'stale-token' }
  }
  await store.login('user', 'pass', controller.signal, true)
  assert.equal(store.user, null)
  assert.equal(cookie.value, null)
  assert.deepEqual(writes, [])
  assert.deepEqual(refreshes, [])
})

test('client logins replace session and remembered lifetimes even for the same token; logout deletes it', async (t) => {
  const { store, client, writes, refreshes, cookie, options } = setup(t, 'unchanged/token')
  client()
  globalThis.$fetch = async () => ({ token: 'unchanged/token' })
  assert.deepEqual(writes, [])
  for (const rememberMe of [false, true, false, true]) {
    await store.login('user', 'pass', undefined, rememberMe)
    const written = writes.at(-1)
    assert.match(written, /^authToken=unchanged%2Ftoken; Path=\/; SameSite=Lax/)
    assert.equal(written.includes('Max-Age=2592000'), rememberMe)
    assert.equal(written.includes('Expires='), false)
  }
  assert.equal(writes.length, 4)
  assert.equal(options.length, 1)
  assert.equal(cookie.value, 'unchanged/token')
  store.logout()
  assert.equal(cookie.value, null)
  assert.equal(store.user, null)
  assert.match(writes.at(-1), /Max-Age=0$/)
  assert.deepEqual(refreshes, Array(5).fill('authToken'))
})

test('stale responses and responses arriving after logout cannot replace token or lifetime', async (t) => {
  const { store, cookie, writes, client } = setup(t)
  client()
  const resolveRequests = []
  globalThis.$fetch = () => new Promise((resolve) => resolveRequests.push(resolve))
  const stale = store.login('user', 'pass', undefined, true)
  const current = store.login('user', 'pass', undefined, false)
  resolveRequests[1]({ token: 'current' })
  await current
  resolveRequests[0]({ token: 'stale' })
  await stale
  assert.equal(cookie.value, 'current')
  assert.equal(writes.length, 1)
  assert.equal(writes[0].includes('Max-Age='), false)

  const cancelled = store.login('user', 'pass', undefined, true)
  store.logout()
  resolveRequests[2]({ token: 'after-logout' })
  await cancelled
  assert.equal(cookie.value, null)
  assert.equal(store.user, null)
  assert.equal(writes.length, 2)
})

test('malformed cookie never becomes user state', (t) => {
  const { store } = setup(t, { unexpected: 'object' })
  assert.equal(store.user, null)
})
