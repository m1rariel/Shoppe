import { useApiFetch } from '~/composables/api/useApiFetch'
import type { Product } from '~/types/api'

export const useGetAllProducts = (options: { limit?: number } = {}) => {
  const { limit } = options

  return useApiFetch<Product[]>('/products', {
    params: {
      limit,
    },
  })
}
