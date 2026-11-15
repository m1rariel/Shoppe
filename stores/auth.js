import { defineStore } from 'pinia'
import { useCookie, useRuntimeConfig } from 'nuxt/app'
import { createApiHeaders, resolveApiBaseURL } from '~/utils/apiConnection'

const cookieOptions = { maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', path: '/' }

export const useAuthStore = defineStore('auth', {
  state: () => {
    const token = useCookie('authToken', cookieOptions).value

    return { user: typeof token === 'string' && token ? token : null }
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async login(username, password, signal) {
      const config = useRuntimeConfig()
      const cookie = useCookie('authToken', cookieOptions)
      const response = await globalThis.$fetch('/auth/login', {
        baseURL: resolveApiBaseURL(config.public.apiBaseUrl),
        method: 'POST',
        timeout: 10000,
        retry: 0,
        headers: createApiHeaders(this.user),
        body: { username, password },
        signal,
      })

      if (signal?.aborted) return
      if (typeof response?.token !== 'string' || !response.token.trim()) {
        throw new Error('The server returned an invalid login response.')
      }

      this.user = response.token
      cookie.value = response.token
    },
    logout() {
      this.user = null
      useCookie('authToken', cookieOptions).value = null
    },
  },
})
