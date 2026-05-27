import { useCookie, useFetch, useRuntimeConfig } from 'nuxt/app'
import type { UseFetchOptions } from 'nuxt/app'

export const useApiFetch = <DataT = unknown>(request: string, options?: UseFetchOptions<DataT>) => {
  const config = useRuntimeConfig()
  const authToken = useCookie('authToken')
  const baseURL = options?.baseURL || config.public.apiBaseUrl

  if (!baseURL) {
    throw new Error('API_BASE_URL is not set')
  }

  const defaults: UseFetchOptions<DataT> = {
    baseURL,
    key: request + JSON.stringify(options?.params),
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken.value ? `Bearer ${authToken.value}` : 'amigo',
    },
  }

  const params = { ...defaults, ...options }

  return useFetch(request, params)
}
