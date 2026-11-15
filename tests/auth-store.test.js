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
        url: 'data:text/javascript,export const useCookie = (...args) => globalThis.authMocks.cookie(...args); export const useRuntimeConfig = () => ({public:{apiBaseUrl:"https://api.example"}})',
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
  globalThis.authMocks = {
    cookie: (name, config) => {
      options.push({ name, config })
      return cookie
    },
  }
  setActivePinia(createPinia())
  t.after(() => {
    delete globalThis.authMocks
    delete globalThis.$fetch
  })
  return { cookie, options, store: useAuthStore() }
}

test('SSR restores only token from cookie and logout removes persisted auth', async (t) => {
  const { store, cookie, options } = setup(t, 'persisted-token')
  const app = createSSRApp({
    render: () => h('span', store.isAuthenticated ? 'Signed in' : 'Guest'),
  })
  assert.equal(await renderToString(app), '<span>Signed in</span>')
  assert.deepEqual(store.$state, { user: 'persisted-token' })
  assert.equal(options[0].config.maxAge, 2592000)
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
  const { store, cookie } = setup(t)
  globalThis.$fetch = async () => {
    throw new Error('Network unavailable')
  }
  await assert.rejects(store.login('user', 'pass'), /Network/)
  globalThis.$fetch = async () => ({ token: '' })
  await assert.rejects(store.login('user', 'pass'), /invalid login response/)
  const controller = new AbortController()
  globalThis.$fetch = async () => {
    controller.abort()
    return { token: 'stale-token' }
  }
  await store.login('user', 'pass', controller.signal)
  assert.equal(store.user, null)
  assert.equal(cookie.value, null)
})

test('malformed cookie never becomes user state', (t) => {
  const { store } = setup(t, { unexpected: 'object' })
  assert.equal(store.user, null)
})
