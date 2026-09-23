import { useApiFetch } from '~/composables/api/useApiFetch'
import type { Product } from '~/types/api'

export const useGetProduct = (id: string) => {
  return useApiFetch<Product>(`/products/${id}`)
}
