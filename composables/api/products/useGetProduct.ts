import { useApiFetch } from '~/composables/api/useApiFetch'
import type { Product } from '~/types/api'
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

export const useGetProduct = (id: MaybeRefOrGetter<string>) => {
  return useApiFetch<Product>(
    computed(() => `/products/${encodeURIComponent(toValue(id))}`),
    {
      lazy: true,
      retry: 0,
    },
  )
}
