import { useApiFetch } from '~/composables/api/useApiFetch'
import type { Product } from '~/types/api'

export const useGetCategories = () => {
  return useApiFetch<Product[]>('/products')
}
