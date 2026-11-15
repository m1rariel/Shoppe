import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      '#imports':
        'export const defineNuxtRouteMiddleware = (middleware) => middleware; export const navigateTo = (to) => globalThis.guestMocks.navigateTo(to)',
      'nuxt/app':
        'export const useCookie = () => globalThis.guestMocks.cookie; export const useRuntimeConfig = () => ({ public: { apiBaseUrl: "https://api.example" } })',
    }
    if (mocks[specifier])
      return { url: `data:text/javascript,${mocks[specifier]}`, shortCircuit: true }
    const files = {
      '~/stores/auth': '../stores/auth.js',
      '~/utils/apiConnection': '../utils/apiConnection.ts',
    }
    if (files[specifier])
      return { url: new URL(files[specifier], import.meta.url).href, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})

const { useAuthStore } = await import('../stores/auth.js')
const { default: guest } = await import('../middleware/guest.ts')

function setup(t, token = null) {
  const cookie = ref(token)
  const destinations = []
  const redirect = Promise.resolve(false)
  globalThis.guestMocks = {
    cookie,
    navigateTo(to) {
      destinations.push(to)
      return redirect
    },
  }
  setActivePinia(createPinia())
  t.after(() => delete globalThis.guestMocks)

  return { store: useAuthStore(), cookie, destinations, redirect }
}

test('guest can enter the account route without a redirect', (t) => {
  const { destinations } = setup(t)

  assert.equal(guest(), undefined)
  assert.deepEqual(destinations, [])
})

test('cookie-restored authentication returns the home redirect to Nuxt', (t) => {
  const { destinations, redirect } = setup(t, 'persisted-token')

  assert.equal(guest(), redirect)
  assert.deepEqual(destinations, ['/'])
})

test('each navigation uses current authentication and allows entry after logout', (t) => {
  const { store, cookie, destinations, redirect } = setup(t)

  assert.equal(guest(), undefined)
  store.user = 'new-token'
  assert.equal(guest(), redirect)
  store.logout()
  assert.equal(cookie.value, null)
  assert.equal(guest(), undefined)
  assert.deepEqual(destinations, ['/'])
})
