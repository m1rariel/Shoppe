import { computed, onScopeDispose, ref, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { useGetAllProducts } from '~/composables/api/products/useGetAllProducts'
import { useVisiblePages } from '~/composables/useVisiblePages'
import { ProductSort } from '~/types/api'
import type { ProductFilters } from '~/types/catalog'

const first = (value: LocationQuery[string]) => (Array.isArray(value) ? value[0] : value) || ''
const pageNumber = (value: LocationQuery[string]) => {
  const page = Number(first(value))
  return Number.isInteger(page) && page > 0 ? page : 1
}
const sortValue = (value: string): ProductSort | '' =>
  Object.values(ProductSort).includes(value as ProductSort) ? (value as ProductSort) : ''

/** URL owns applied filters; the only local filter state is the debounced search draft. */
export const useProductCatalog = async () => {
  const route = useRoute()
  const router = useRouter()
  const filters = computed<ProductFilters>(() => ({
    search: first(route.query.search),
    category: first(route.query.category),
    sortBy: sortValue(first(route.query.sortBy)),
  }))
  const searchDraft = ref(filters.value.search)
  const navigating = ref(false)
  let desiredQuery: LocationQueryRaw | undefined
  let navigation: Promise<unknown> | undefined
  let navigationId = 0
  const ownTargets = new Map<string, number>()
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const cancelSearch = () => {
    clearTimeout(searchTimer)
    searchTimer = undefined
  }

  const navigate = (query: LocationQueryRaw, replace = false) => {
    const target = { path: route.path, hash: route.hash, query }
    const fullPath = router.resolve(target).fullPath
    // Nuxt's page route may lag behind a completed navigation during hydration.
    if (
      (!desiredQuery && fullPath === router.currentRoute.value.fullPath) ||
      fullPath ===
        router.resolve({ path: route.path, hash: route.hash, query: desiredQuery || route.query })
          .fullPath
    )
      return
    const id = ++navigationId
    desiredQuery = query
    navigating.value = true
    ownTargets.set(fullPath, (ownTargets.get(fullPath) || 0) + 1)
    navigation = router[replace ? 'replace' : 'push'](target).finally(() => {
      // An earlier cancelled navigation must not unmark a newer identical target.
      const remaining = (ownTargets.get(fullPath) || 0) - 1
      if (remaining > 0) ownTargets.set(fullPath, remaining)
      else ownTargets.delete(fullPath)
      if (navigationId === id) {
        desiredQuery = undefined
        navigating.value = false
      }
    })
    return navigation
  }

  watch(
    () => route.fullPath,
    (fullPath) => {
      if (!ownTargets.has(fullPath)) {
        cancelSearch()
        searchDraft.value = filters.value.search
        desiredQuery = undefined
        navigationId++
        navigating.value = false
      } else if (!searchTimer) {
        searchDraft.value = filters.value.search
      }
    },
    { flush: 'sync' },
  )
  onScopeDispose(cancelSearch)

  const setFilter = (key: keyof ProductFilters, value: string, replace = false) => {
    const query = desiredQuery || route.query
    const existing = query[key]
    if ((Array.isArray(existing) ? existing[0] : existing) === value || (!existing && !value))
      return
    navigate({ ...query, [key]: value || undefined, page: '1' }, replace)
  }
  const setSearch = (value: string | number | undefined) => {
    cancelSearch()
    searchDraft.value = String(value ?? '')
    searchTimer = setTimeout(() => {
      searchTimer = undefined
      setFilter('search', searchDraft.value, true)
    }, 500)
  }
  const setCategory = (value: string) => setFilter('category', value)
  const setSort = (value: ProductFilters['sortBy']) => setFilter('sortBy', value)
  const changePage = (page: number) => {
    const query = desiredQuery || route.query
    if (pageNumber(query.page as LocationQuery[string]) === page) return
    navigate({ ...query, page: String(page) })
  }

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
  const request = useGetAllProducts({ category })
  const { data, pending, error, status } = request
  // Changing the request category invalidates old data before Nuxt starts its next fetch.
  watch(
    [data, status],
    () => {
      categoryReady.value = status.value === 'success'
    },
    { flush: 'post' },
  )
  const filteredProducts = computed(() => {
    let products = [...(data.value || [])]
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
  // Nuxt's SSR page route can retain its initial query after router.replace.
  // Derive the display page from ready data without waiting for that route update.
  const currentPage = computed(() => {
    const page = pageNumber(route.query.page)
    return dataReady.value ? Math.min(page, Math.max(1, totalPages.value)) : page
  })
  const products = computed(() =>
    filteredProducts.value.slice((currentPage.value - 1) * 6, currentPage.value * 6),
  )
  const visiblePages = useVisiblePages(currentPage, totalPages)

  const normalizeQuery = () => {
    if (navigating.value) return navigation
    const query = { ...route.query }
    let normalize = false
    const rawPage = first(query.page)
    const page = pageNumber(query.page)
    if (query.page !== undefined && (!Number.isInteger(Number(rawPage)) || Number(rawPage) < 1)) {
      query.page = '1'
      normalize = true
    }
    if (first(query.sortBy) && !sortValue(first(query.sortBy))) {
      delete query.sortBy
      normalize = true
    }
    if (dataReady.value) {
      const lastPage = Math.max(1, totalPages.value)
      if (page > lastPage) {
        query.page = String(lastPage)
        normalize = true
      }
    }
    if (normalize) return navigate(query, true)
  }
  watch(
    [() => route.query, totalPages, dataReady, navigating],
    () => {
      void normalizeQuery()
    },
    { immediate: true, flush: 'post' },
  )

  await request
  if (category.value === initialCategory && status.value === 'success') categoryReady.value = true
  // SSR stops non-sync watchers after setup: finish initial URL normalization explicitly.
  await navigation
  await normalizeQuery()
  return {
    filters,
    searchDraft,
    products,
    currentPage,
    totalPages,
    visiblePages,
    pending,
    error,
    setSearch,
    setCategory,
    setSort,
    changePage,
    retry: () => request.refresh(),
  }
}
