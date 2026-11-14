import { useCookie, useFetch, useRuntimeConfig } from 'nuxt/app'
import type { UseFetchOptions } from 'nuxt/app'
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { createApiHeaders, resolveApiBaseURL } from '~/utils/apiConnection'

export const useApiFetch = <ResT = unknown, DataT = ResT>(
  request: MaybeRefOrGetter<string>,
  options?: UseFetchOptions<ResT, DataT>,
) => {
  const config = useRuntimeConfig()
  const authToken = useCookie('authToken')
  const baseURL = resolveApiBaseURL(config.public.apiBaseUrl, options?.baseURL)
  const key = computed(() => toValue(request) + JSON.stringify(toValue(options?.params) || {}))

  const defaults: UseFetchOptions<ResT, DataT> = {
    baseURL,
    key,
    headers: createApiHeaders(authToken.value),
  }
  const fetchOptions: UseFetchOptions<ResT, DataT> = { ...defaults, ...options }

  return useFetch(request, fetchOptions)
}
