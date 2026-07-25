<script setup lang="ts">
  import { ProductSort, type Product } from '~/types/api'
  import { NotificationTypes, useNotification } from '#imports'
  import { useGetAllProducts } from '~/composables/api/products/useGetAllProducts'
  import ProductFilter from '~/components/ProductFilter.vue'
  import { computed, reactive, watch } from '#imports'
  import { useRoute, useRouter } from '#imports'
  import { useVisiblePages } from '~/composables/useVisiblePages'
  import { useIsMobile } from '~/composables/useIsMobile'
  import { useGetCategories } from '~/composables/api/products/useGetCategories'

  const route = useRoute()
  const router = useRouter()
  const { showNotification } = useNotification()
  const { data: categories } = await useGetCategories()
  const pageSize = 6

  const filters = reactive({
    search: String(route.query.search || ''),
    category: String(route.query.category || ''),
    sortBy: String(route.query.sortBy || ''),
    onSale: route.query.onSale === 'true',
    inStock: route.query.inStock === 'true',
  })

  const isMobile = useIsMobile()

  const currentPage = computed(() => Number(route.query.page) || 1)

  const selectedCategory = computed(() => filters.category || undefined)

  const { data: products, pending } = await useGetAllProducts({
    category: selectedCategory,
  })

  const safeProducts = computed<Product[]>(() => products.value || [])

  const filteredProducts = computed(() => {
    let result = [...safeProducts.value]

    if (filters.search) {
      const search = filters.search.toLowerCase()

      result = result.filter((product) => product.title.toLowerCase().includes(search))
    }

    if (filters.sortBy === ProductSort.PriceAsc) {
      result.sort((a, b) => a.price - b.price)
    }

    if (filters.sortBy === ProductSort.PriceDesc) {
      result.sort((a, b) => b.price - a.price)
    }

    if (filters.sortBy === ProductSort.TitleAsc) {
      result.sort((a, b) => a.title.localeCompare(b.title))
    }
    return result
  })

  const totalPages = computed(() => Math.ceil(filteredProducts.value.length / pageSize))

  const visiblePages = useVisiblePages(currentPage, totalPages)

  const paginationProducts = computed(() => {
    const startPage = (currentPage.value - 1) * pageSize
    return filteredProducts.value.slice(startPage, startPage + pageSize)
  })

  const changePage = (page: number) => {
    router.push({
      path: '/products',
      query: {
        page,
        search: filters.search || undefined,
        category: filters.category || undefined,
        sortBy: filters.sortBy || undefined,
        onSale: filters.onSale ? 'true' : undefined,
        inStock: filters.inStock ? 'true' : undefined,
      },
    })
  }

  const handleAddToCart = (product: Product) => {
    showNotification({
      message: `${product.title} was been added to your Shopping bag`,
      type: NotificationTypes.SUCCESS,
    })
  }

  watch(
    filters,
    () => {
      router.push({
        path: '/products',
        query: {
          page: 1,
          search: filters.search || undefined,
          category: filters.category || undefined,
          sortBy: filters.sortBy || undefined,
          onSale: filters.onSale ? 'true' : undefined,
          inStock: filters.inStock ? 'true' : undefined,
        },
      })
    },
    { deep: true },
  )
</script>
<template>
  <section class="products-page container">
    <div v-if="!isMobile" class="products-page__header">
      <h1 class="products-page__header-title">Shop The Latest</h1>
    </div>
    <div v-else-if="isMobile" class="products-page__header">
      <h1 class="products-page__header-title__mobile">Shop</h1>
    </div>

    <div class="products-page__layout">
      <ProductFilter
        class="products-page__filters"
        :filters="filters"
        :categories="categories || []"
        @update:filters="Object.assign(filters, $event)"
      />

      <div class="products-page__content">
        <p v-if="pending">Loading...</p>

        <ProductCardList v-else :products="paginationProducts" @add-to-cart="handleAddToCart" />

        <BasePagination
          :current-page="currentPage"
          :total-pages="totalPages"
          :visible-pages="visiblePages"
          @change-page="changePage"
        />
      </div>
    </div>
  </section>
</template>
<style lang="scss" scoped>
  .products-page__header-title__mobile {
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    color: $color-black;
  }

  .products-page {
    padding-top: 96px;

    @media (max-width: $breakpoints-l) {
      padding-top: 24px;
    }
  }

  .products-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .products-page__header-title {
    font-size: 33px;
    font-style: $font-main;
    font-weight: $font-weight-medium;
    line-height: 43px;
    letter-spacing: 0%;
  }

  .products-page__layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .products-page__filters {
    margin-top: 15px;
  }

  @media (width >= $breakpoints-m) {
    .products-page__layout {
      grid-template-columns: 260px 1fr;
      gap: 48px;
    }
  }
</style>
