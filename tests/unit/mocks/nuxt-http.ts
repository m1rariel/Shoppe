import { $fetch, AbortController, type FetchError } from 'ofetch'
import { onScopeDispose, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

export const apiBaseURL = 'https://shoppe-api.test'

export const useRuntimeConfig = () => ({ public: { apiBaseUrl: apiBaseURL } })
export const useCookie = () => ref<string | null>(null)

export function useFetch<T>(
  request: MaybeRefOrGetter<string>,
  options: {
    baseURL?: string
    params?: MaybeRefOrGetter<Record<string, unknown>>
    headers?: Record<string, string>
    retry?: number
  } = {},
) {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<FetchError | null>(null)
  const pending = ref(false)
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  let controller: AbortController | undefined
  let version = 0

  const refresh = async () => {
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    pending.value = true
    status.value = 'pending'
    error.value = null
    try {
      const result = await $fetch<T>(toValue(request), {
        baseURL: options.baseURL,
        query: toValue(options.params),
        headers: options.headers,
        retry: options.retry,
        signal: controller.signal,
      })
      if (current !== version) return
      data.value = result
      status.value = 'success'
    } catch (cause) {
      if (current !== version) return
      data.value = null
      error.value = cause as FetchError
      status.value = 'error'
    } finally {
      if (current === version) pending.value = false
    }
  }

  watch([() => toValue(request), () => toValue(options.params)], refresh, { immediate: true })
  onScopeDispose(() => {
    version++
    controller?.abort()
  })
  return { data, error, pending, status, refresh }
}
