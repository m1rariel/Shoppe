import { defineStore } from 'pinia'
import { refreshCookie, useCookie, useRuntimeConfig } from 'nuxt/app'
import { createApiHeaders, resolveApiBaseURL } from '~/utils/apiConnection'

const cookieOptions = { sameSite: 'lax', path: '/' }
const rememberedMaxAge = 60 * 60 * 24 * 30
const loginRequests = new WeakMap()

// Nuxt skips equal cookie values, but a repeated token must still replace its lifetime.
const writeClientToken = (token, rememberMe = false) => {
  const value = token === null ? '' : encodeURIComponent(token)
  const lifetime =
    token === null ? '; Max-Age=0' : rememberMe ? `; Max-Age=${rememberedMaxAge}` : ''
  document.cookie = `authToken=${value}; Path=/; SameSite=Lax${lifetime}`
  refreshCookie('authToken')
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const token = useCookie('authToken', { ...cookieOptions, readonly: true, watch: false }).value

    return { user: typeof token === 'string' && token ? token : null }
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async login(username, password, signal, rememberMe = false) {
      const config = useRuntimeConfig()
      const cookie =
        typeof document === 'undefined'
          ? useCookie('authToken', {
              ...cookieOptions,
              ...(rememberMe ? { maxAge: rememberedMaxAge } : {}),
            })
          : null
      const request = {}
      loginRequests.set(this, request)

      try {
        const response = await globalThis.$fetch('/auth/login', {
          baseURL: resolveApiBaseURL(config.public.apiBaseUrl),
          method: 'POST',
          timeout: 10000,
          retry: 0,
          headers: createApiHeaders(this.user),
          body: { username, password },
          signal,
        })

        if (signal?.aborted || loginRequests.get(this) !== request) return
        if (typeof response?.token !== 'string' || !response.token.trim()) {
          throw new Error('The server returned an invalid login response.')
        }

        if (cookie) cookie.value = response.token
        else writeClientToken(response.token, rememberMe)
        this.user = response.token
      } finally {
        if (loginRequests.get(this) === request) loginRequests.delete(this)
      }
    },
    logout() {
      loginRequests.delete(this)
      this.user = null
      if (typeof document === 'undefined') useCookie('authToken', cookieOptions).value = null
      else writeClientToken(null)
    },
  },
})
