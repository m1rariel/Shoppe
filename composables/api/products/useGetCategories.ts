import { useApiFetch } from '~/composables/api/useApiFetch'
import type { ProductCategoriesResponse } from '~/types/api'

export const useGetCategories = () => {
  return useApiFetch<ProductCategoriesResponse, string[]>('/products/categories', {
    transform: (response: ProductCategoriesResponse) =>
      response.categories.map((category) => category.name),
  })
}
