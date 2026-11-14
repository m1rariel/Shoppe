<script setup lang="ts">
  import { type Product } from '~/types/api'
  import { useRoutedProductCatalog } from '~/composables/useRoutedProductCatalog'
  import ProductFilter from '~/components/ProductFilter.vue'
  import { useGetCategories } from '~/composables/api/products/useGetCategories'
  import { useCartStore } from '~/stores/cartStore'

  const cartStore = useCartStore()
  const { data: categories } = await useGetCategories()
  const {
    filters,
    searchDraft,
    products,
    pending,
    error,
    currentPage,
    totalPages,
    visiblePages,
    setSearch,
    setCategory,
    setSort,
    changePage,
    retry,
  } = await useRoutedProductCatalog()

  const handleAddToCart = async (product: Product) => {
    await cartStore.addItem(product)
  }
</script>
<template>
  <section class="products-page container">
    <header class="products-page__header">
      <h1 class="products-page__header-title">
        <span class="products-page__desktop-title">Shop The Latest</span>
        <span class="products-page__mobile-title">Shop</span>
      </h1>
    </header>

    <div class="products-page__layout">
      <ProductFilter
        class="products-page__filters"
        :filters="filters"
        :categories="categories || []"
        :search-draft="searchDraft"
        @search="setSearch"
        @category="setCategory"
        @sort="setSort"
      />

      <div class="products-page__content" :aria-busy="pending">
        <div v-if="pending" class="products-page__state" role="status">
          <p class="products-page__state-title">Loading products…</p>
          <p class="products-page__state-description">Please wait while we load the catalog.</p>
        </div>

        <div v-else-if="error" class="products-page__state" role="alert">
          <h2 class="products-page__state-title">Unable to load products</h2>
          <p class="products-page__state-description">Please try again or come back later.</p>
          <BaseButton class="products-page__retry" @click="retry">Try again</BaseButton>
        </div>

        <div v-else-if="products.length === 0" class="products-page__state" role="status">
          <h2 class="products-page__state-title">No products found</h2>
          <p class="products-page__state-description">
            Try a different search or change the filters.
          </p>
        </div>

        <ProductCardList v-else :products="products" @add-to-cart="handleAddToCart" />

        <BasePagination
          v-if="!pending && !error && products.length > 0 && totalPages > 1"
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
  .products-page {
    padding-top: 101px;

    @media (width < $breakpoints-l) {
      padding-top: 48px;
    }

    @media (width < $breakpoints-m) {
      padding-top: 24px;
    }
  }

  .products-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .products-page__header-title {
    font-family: $font-main;
    font-size: 33px;
    font-weight: $font-weight-medium;
    line-height: 43px;
    color: $color-black;

    @media (width < $breakpoints-m) {
      font-size: 20px;
      font-weight: $font-weight-regular;
      line-height: 26px;
    }
  }

  .products-page__desktop-title {
    @media (width < $breakpoints-m) {
      display: none;
    }
  }

  .products-page__mobile-title {
    display: none;

    @media (width < $breakpoints-m) {
      display: inline;
    }
  }

  .products-page__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    margin-top: 15px;

    @media (width >= $breakpoints-m) {
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 32px;
      margin-top: 39px;
    }

    @media (width >= $breakpoints-l) {
      grid-template-columns: 261px minmax(0, 1fr);
      gap: 39px;
    }
  }

  .products-page__content {
    min-width: 0;
  }

  .products-page__filters {
    @media (width < $breakpoints-m) {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .products-page__state {
    min-height: 180px;
    padding: 32px 24px;
    font-family: $font-main;
    background-color: $color-light-gray;
    border-radius: 8px;
  }

  .products-page__state-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: $font-weight-medium;
    line-height: 1.3;
  }

  .products-page__state-description {
    max-width: 40ch;
    margin-top: 12px;
    font-size: 1rem;
    line-height: 1.5;
    color: $color-dark-gray;
  }

  .products-page__retry {
    min-height: 44px;
    padding: 8px 16px;
    margin-top: 24px;
    font-size: 14px;
    line-height: 22px;
    color: $color-black;
    background: $color-white;
    border: 1px solid $color-black;
    border-radius: 4px;
  }
</style>
