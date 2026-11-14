import { computed, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute, useRouter } from '#imports'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { ProductSort } from '~/types/api'
import type { ProductFilters } from '~/types/catalog'

const queryValue = (value: LocationQuery[string]) => (Array.isArray(value) ? value[0] : value) || ''
const parsePage = (value: LocationQuery[string]) => {
  const page = Number(queryValue(value))

  return Number.isInteger(page) && page > 0 ? page : 1
}

const parseSort = (value: string): ProductSort | '' =>
  Object.values(ProductSort).includes(value as ProductSort) ? (value as ProductSort) : ''

export const useProductCatalogQuery = () => {
  const route = useRoute()
  const router = useRouter()
  const filters = computed<ProductFilters>(() => ({
    search: queryValue(route.query.search),
    category: queryValue(route.query.category),
    sortBy: parseSort(queryValue(route.query.sortBy)),
  }))
  const searchDraft = ref(filters.value.search)
  const navigating = ref(false)
  let desiredQuery: LocationQueryRaw | undefined
  let pendingNavigation: Promise<unknown> | undefined
  let navigationId = 0
  const pendingNavigationCounts = new Map<string, number>()
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const cancelSearch = () => {
    clearTimeout(searchTimer)
    searchTimer = undefined
  }

  const navigate = (query: LocationQueryRaw, replace = false) => {
    const target = { path: route.path, hash: route.hash, query }
    const fullPath = router.resolve(target).fullPath
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
    pendingNavigationCounts.set(fullPath, (pendingNavigationCounts.get(fullPath) || 0) + 1)
    pendingNavigation = router[replace ? 'replace' : 'push'](target).finally(() => {
      const remainingNavigations = (pendingNavigationCounts.get(fullPath) || 0) - 1
      if (remainingNavigations > 0) pendingNavigationCounts.set(fullPath, remainingNavigations)
      else pendingNavigationCounts.delete(fullPath)
      if (navigationId === id) {
        desiredQuery = undefined
        navigating.value = false
      }
    })

    return pendingNavigation
  }

  watch(
    () => route.fullPath,
    (fullPath) => {
      if (!pendingNavigationCounts.has(fullPath)) {
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
    if (parsePage(query.page as LocationQuery[string]) === page) return
    navigate({ ...query, page: String(page) })
  }

  const requestedPage = computed(() => parsePage(route.query.page))

  const bindPagination = (totalPages: ComputedRef<number>, dataReady: ComputedRef<boolean>) => {
    const normalizeQuery = () => {
      if (navigating.value) return pendingNavigation
      const query = { ...route.query }
      let needsNormalization = false
      const rawPage = queryValue(query.page)
      const page = parsePage(query.page)
      if (query.page !== undefined && (!Number.isInteger(Number(rawPage)) || Number(rawPage) < 1)) {
        query.page = '1'
        needsNormalization = true
      }
      if (queryValue(query.sortBy) && !parseSort(queryValue(query.sortBy))) {
        delete query.sortBy
        needsNormalization = true
      }
      if (dataReady.value) {
        const lastPage = Math.max(1, totalPages.value)
        if (page > lastPage) {
          query.page = String(lastPage)
          needsNormalization = true
        }
      }
      if (needsNormalization) return navigate(query, true)
    }
    watch(
      [() => route.query, totalPages, dataReady, navigating],
      () => {
        void normalizeQuery()
      },
      { immediate: true, flush: 'post' },
    )

    return async () => {
      await pendingNavigation
      await normalizeQuery()
    }
  }

  return {
    filters,
    requestedPage,
    searchDraft,
    setSearch,
    setCategory,
    setSort,
    changePage,
    bindPagination,
  }
}
