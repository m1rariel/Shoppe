import { useProductCatalog } from '~/composables/useProductCatalog'
import { useProductCatalogQuery } from '~/composables/useProductCatalogQuery'

export const useRoutedProductCatalog = async () => {
  const query = useProductCatalogQuery()
  const catalog = useProductCatalog(query.filters, query.requestedPage)
  const finishNormalization = query.bindPagination(catalog.totalPages, catalog.dataReady)

  await catalog.ready
  await finishNormalization()

  return {
    filters: query.filters,
    searchDraft: query.searchDraft,
    products: catalog.products,
    currentPage: catalog.currentPage,
    totalPages: catalog.totalPages,
    visiblePages: catalog.visiblePages,
    pending: catalog.pending,
    error: catalog.error,
    setSearch: query.setSearch,
    setCategory: query.setCategory,
    setSort: query.setSort,
    changePage: query.changePage,
    retry: catalog.retry,
  }
}
