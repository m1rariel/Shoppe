import { defineStore } from 'pinia'
import { useRuntimeConfig } from 'nuxt/app'
import { createApiHeaders, resolveApiBaseURL } from '~/utils/apiConnection'
import { clearAuthToken, createAuthTokenWriter, readAuthToken } from '~/utils/authCookie'

const loginAttempts = new WeakMap()

export const useAuthStore = defineStore('auth', {
  state: () => ({ authToken: readAuthToken() }),
  getters: {
    isAuthenticated: (state) => Boolean(state.authToken),
  },
  actions: {
    async login(username, password, signal, rememberMe = false) {
      if (signal?.aborted) return false

      const config = useRuntimeConfig()
      const writeToken = createAuthTokenWriter(rememberMe)
      const loginAttempt = {}
      loginAttempts.set(this, loginAttempt)

      try {
        const response = await globalThis.$fetch('/auth/login', {
          baseURL: resolveApiBaseURL(config.public.apiBaseUrl),
          method: 'POST',
          timeout: 10000,
          retry: 0,
          headers: createApiHeaders(this.authToken),
          body: { username, password },
          signal,
        })

        if (signal?.aborted || loginAttempts.get(this) !== loginAttempt) return false
        if (typeof response?.token !== 'string' || !response.token.trim()) {
          throw new Error('The server returned an invalid login response.')
        }

        writeToken(response.token)
        this.authToken = response.token
        return true
      } catch (error) {
        if (signal?.aborted || loginAttempts.get(this) !== loginAttempt) return false
        throw error
      } finally {
        if (loginAttempts.get(this) === loginAttempt) loginAttempts.delete(this)
      }
    },
    logout() {
      loginAttempts.delete(this)
      this.authToken = null
      clearAuthToken()
    },
  },
})
