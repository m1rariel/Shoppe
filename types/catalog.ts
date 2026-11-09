import type { ProductSort } from '~/types/api'

export type ProductFilters = {
  search: string
  category: string
  sortBy: ProductSort | ''
}
