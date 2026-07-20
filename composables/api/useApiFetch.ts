import { useCookie, useFetch, useRuntimeConfig } from 'nuxt/app'
import type { UseFetchOptions } from 'nuxt/app'
import { computed, toValue } from 'vue'

export const useApiFetch = <DataT = unknown>(request: string, options?: UseFetchOptions<DataT>) => {
  const config = useRuntimeConfig()
  const authToken = useCookie('authToken')
  const baseURL = options?.baseURL || config.public.apiBaseUrl

  if (!baseURL) {
    throw new Error('API_BASE_URL is not set')
  }
  const key = computed(() => request + JSON.stringify(toValue(options?.params) || {}))

  const defaults: UseFetchOptions<DataT> = {
    baseURL,
    key,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken.value ? `Bearer ${authToken.value}` : 'amigo',
    },
  }
  const params = { ...defaults, ...options }

  return useFetch(request, params)
}
