import { useApiFetch } from '~/composables/api/useApiFetch'
import type { Product } from '~/types/api'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'

export const useGetAllProducts = (
  options: {
    limit?: MaybeRefOrGetter<number> | undefined
    category?: MaybeRefOrGetter<string | undefined> | undefined
  } = {},
) => {
  const params = computed(() => ({
    limit: toValue(options.limit),
    category: toValue(options.category) || undefined,
  }))

  return useApiFetch<Product[]>('/products', {
    params,
  })
}
