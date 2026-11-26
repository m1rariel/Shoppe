import { useFetch, useRuntimeConfig } from 'nuxt/app'
import type { UseFetchOptions } from 'nuxt/app'
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { createApiHeaders, resolveApiBaseURL } from '~/utils/apiConnection'

export const useApiFetch = <ResT = unknown, DataT = ResT>(
  request: MaybeRefOrGetter<string>,
  options?: UseFetchOptions<ResT, DataT>,
) => {
  const config = useRuntimeConfig()
  const baseURL = resolveApiBaseURL(config.public.apiBaseUrl, options?.baseURL)
  const key = computed(() => toValue(request) + JSON.stringify(toValue(options?.params) || {}))

  const defaults: UseFetchOptions<ResT, DataT> = {
    baseURL,
    key,
    // Public catalog access requires amigo regardless of the user's login token.
    headers: createApiHeaders(null),
  }
  const fetchOptions: UseFetchOptions<ResT, DataT> = { ...defaults, ...options }

  return useFetch(request, fetchOptions)
}
