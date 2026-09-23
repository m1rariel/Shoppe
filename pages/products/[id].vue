<script setup lang="ts">
  import { useRoute } from '#app'
  import { useGetProduct } from '~/composables/api/products/useGetProduct'

  const route = useRoute()
  const { data: product, pending, error } = await useGetProduct(route.params.id as string)
</script>

<template>
  <section class="product-page container">
    <p v-if="pending">Loading</p>
    <p v-else-if="error">Не удалось загрузить</p>

    <div v-else-if="product" class="product-page__content">
      <ProductGallery :images="product.image ? Array(4).fill(product.image) : []" />
      <ProductInfo :product="product" />
    </div>

    <p v-else>Товар не найден</p>
  </section>
</template>
<style lang="scss" scoped>
  .product-page {
    padding-top: 96px;
  }

  .product-page__content {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 64px;
    align-items: start;
  }

  @media (max-width: $breakpoints-m) {
    .product-page {
      max-width: none;
      padding-top: 24px;
      padding-right: 16px;
      padding-left: 16px;
    }

    .product-page__content {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
  }
</style>
