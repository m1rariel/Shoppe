<script setup lang="ts">
  import type { Product } from '~/types/api'
  import { NotificationTypes, useNotification } from '#imports'
  import { useGetAllProducts } from '~/composables/api/products/useGetAllProducts'
  import ProductFilter from '~/components/ProductFilter.vue'
  import { computed } from '#imports'
  import { useRoute, useRouter } from '#imports'
  import { useGetRandomPhotos } from '#imports'

  const route = useRoute()
  const router = useRouter()
  const { showNotification } = useNotification()

  const pageSize = 6

  const currentPage = computed(() => Number(route.query.page) || 1)

  const { data: products, pending } = await useGetAllProducts()

  const { data: photos } = await useGetRandomPhotos(pageSize)

  const safeProducts = computed<Product[]>(() => products.value || [])

  const totalPages = computed(() => Math.ceil(safeProducts.value.length / pageSize))

  const productsWithPhotos = computed(() => {
    return paginationProducts.value.map((product, index) => ({
      ...product,
      image: photos.value?.[index]?.download_url || '',
    }))
  })

  const visiblePages = computed(() => {
    return [1, 2, 3].filter((page) => page <= totalPages.value)
  })

  const paginationProducts = computed(() => {
    const startPage = currentPage.value * pageSize
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
      message: `${product.name} was been added to  your Shopping bag`,
      type: NotificationTypes.SUCCESS,
    })
  }
</script>
<template>
  <section class="products-page container">
    <div class="products-page__header">
      <h1>Shop The Latest</h1>
    </div>

    <div class="products-page__layout">
      <ProductFilter class="products-page__filters" />

      <div class="products-page__content">
        <p v-if="pending">Loading...</p>

        <ProductCardList v-else :products="productsWithPhotos" @add-to-cart="handleAddToCart" />

        <div class="pagination">
          <BaseButton
            v-for="page in visiblePages"
            :key="page"
            type="button"
            :class="{ active: page === currentPage }"
            @click="changePage(page)"
          >
            {{ page }}
          </BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>
<style lang="scss" scoped>
  .products-page {
    padding-top: 96px;
  }

  .products-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .products-page__header h1 {
    font-size: 33px;
    font-style: $font-main;
    font-weight: $font-weight-medium;
    line-height: 43px;
    letter-spacing: 0%;
  }

  .products-page__layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 48px;
  }

  .pagination {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 86px;
  }

  .pagination button {
    width: 40px;
    height: 40px;
    border: 1px solid $color-gray;
  }

  .pagination button.active {
    color: $color-white;
    background: $color-black;
  }
</style>
