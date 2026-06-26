<script setup lang="ts">
  import type { Product } from '~/types/api'
  import { NotificationTypes, useNotification } from '#imports'
  import { useGetAllProducts } from '~/composables/api/products/useGetAllProducts'
  import ProductFilter from '~/components/ProductFilter.vue'
  import { computed } from '#imports'
  import { useRoute, useRouter } from '#imports'
  import { ref } from 'vue'
  import { onMounted } from 'vue'

  const route = useRoute()
  const router = useRouter()
  const { showNotification } = useNotification()

  const pageSize = 6

  const isMobile = ref(false)

  const currentPage = computed(() => Number(route.query.page) || 1)

  const { data: products, pending } = await useGetAllProducts()

  const safeProducts = computed<Product[]>(() => products.value || [])

  const totalPages = computed(() => Math.ceil(safeProducts.value.length / pageSize))

  const visiblePages = computed(() => {
    const pagesCount = 3
    const total = totalPages.value
    const current = currentPage.value

    let start = current - 1
    let end = current + 1

    if (start < 1) {
      start = 1
      end = Math.min(pagesCount, total)
    }

    if (end > total) {
      end = total
      start = Math.max(1, total - pagesCount + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  })

  const paginationProducts = computed(() => {
    const startPage = (currentPage.value - 1) * pageSize
    return safeProducts.value.slice(startPage, startPage + pageSize)
  })

  const changePage = (page: number) => {
    router.push({
      path: '/products',
      query: { page },
    })
  }

  const handleAddToCart = (product: Product) => {
    showNotification({
      message: `${product.title} was been added to your Shopping bag`,
      type: NotificationTypes.SUCCESS,
    })
  }

  onMounted(() => {
    isMobile.value = window.innerWidth < 768
  })
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
      <ProductFilter class="products-page__filters" />

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
