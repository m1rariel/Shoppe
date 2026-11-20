import { refreshCookie, useCookie } from 'nuxt/app'

const AUTH_COOKIE_NAME = 'authToken'
const AUTH_COOKIE_OPTIONS = { sameSite: 'lax' as const, path: '/' }
const REMEMBERED_MAX_AGE = 60 * 60 * 24 * 30

const writeClientToken = (token: string | null, rememberMe = false) => {
  const value = token === null ? '' : encodeURIComponent(token)
  const lifetime =
    token === null ? '; Max-Age=0' : rememberMe ? `; Max-Age=${REMEMBERED_MAX_AGE}` : ''

  document.cookie = `${AUTH_COOKIE_NAME}=${value}; Path=${AUTH_COOKIE_OPTIONS.path}; SameSite=Lax${lifetime}`
  refreshCookie(AUTH_COOKIE_NAME)
}

export const readAuthToken = (): string | null => {
  const token = useCookie<unknown>(AUTH_COOKIE_NAME, {
    ...AUTH_COOKIE_OPTIONS,
    readonly: true,
    watch: false,
  }).value

  return typeof token === 'string' && token ? token : null
}

export const createAuthTokenWriter = (rememberMe = false) => {
  if (typeof document !== 'undefined') {
    return (token: string) => writeClientToken(token, rememberMe)
  }

  const cookie = useCookie<string | null>(AUTH_COOKIE_NAME, {
    ...AUTH_COOKIE_OPTIONS,
    ...(rememberMe ? { maxAge: REMEMBERED_MAX_AGE } : {}),
  })

  return (token: string) => {
    cookie.value = token
  }
}

export const clearAuthToken = () => {
  if (typeof document !== 'undefined') writeClientToken(null)
  else useCookie<string | null>(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS).value = null
}
