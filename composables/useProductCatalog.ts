import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useGetProducts } from '~/composables/api/products/useGetProducts'
import { useVisiblePages } from '~/composables/useVisiblePages'
import { ProductSort } from '~/types/api'
import type { ProductFilters } from '~/types/catalog'

export const useProductCatalog = (
  filters: ComputedRef<ProductFilters>,
  requestedPage: ComputedRef<number>,
) => {
  const category = computed(() => filters.value.category || undefined)
  const initialCategory = category.value
  const categoryReady = ref(false)
  watch(
    category,
    () => {
      categoryReady.value = false
    },
    { flush: 'sync' },
  )

  const productRequest = useGetProducts({ category })
  const { data: fetchedProducts, pending, error, status } = productRequest
  watch(
    [fetchedProducts, status],
    () => {
      categoryReady.value = status.value === 'success'
    },
    { flush: 'post' },
  )

  const filteredProducts = computed(() => {
    let products = [...(fetchedProducts.value || [])]
    const search = filters.value.search.toLowerCase()
    if (search)
      products = products.filter((product) => product.title.toLowerCase().includes(search))
    switch (filters.value.sortBy) {
      case ProductSort.PriceAsc:
        products.sort((a, b) => a.price - b.price)
        break
      case ProductSort.PriceDesc:
        products.sort((a, b) => b.price - a.price)
        break
      case ProductSort.TitleAsc:
        products.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    return products
  })

  const totalPages = computed(() => Math.ceil(filteredProducts.value.length / 6))
  const dataReady = computed(
    () => categoryReady.value && !pending.value && status.value === 'success' && !error.value,
  )

  const currentPage = computed(() => {
    const page = requestedPage.value

    return dataReady.value ? Math.min(page, Math.max(1, totalPages.value)) : page
  })

  const products = computed(() =>
    filteredProducts.value.slice((currentPage.value - 1) * 6, currentPage.value * 6),
  )

  const visiblePages = useVisiblePages(currentPage, totalPages)

  const ready = Promise.resolve(productRequest).then(() => {
    if (category.value === initialCategory && status.value === 'success') categoryReady.value = true
  })

  return {
    products,
    currentPage,
    totalPages,
    visiblePages,
    pending,
    error,
    dataReady,
    ready,
    retry: () => productRequest.refresh(),
  }
}
