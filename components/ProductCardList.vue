<script setup lang="ts">
  import type { Product } from '~/types/api'
  import ProductCard from './ProductCard.vue'

  defineProps<{
    products: Product[]
  }>()

  const emit = defineEmits<{
    addToCart: [product: Product]
  }>()

  const cardNames = [
    'Lira Earrings',
    'Hal Earrings',
    'Kaede Hair Pin Set Of 3',
    'Hair Pin Set of 3',
    'Plaine Necklace',
    'Yuki Hair Pin Set of 3',
  ]

  const getCardProduct = (product: Product, index: number): Product => ({
    ...product,
    name: cardNames[index] || product.name,
  })
</script>
<template>
  <div class="product-list">
    <ProductCard
      v-for="(product, index) in products"
      :key="product.id"
      :product="getCardProduct(product, index)"
      @add-to-cart="emit('addToCart', getCardProduct(product, index))"
    />
  </div>
</template>
<style lang="scss" scoped>
  @use '~/assets/styles/breakpoints' as *;

  .product-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 70px 25px;
  }

  @media (min-width: $breakpoints-m) {
    .product-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: $breakpoints-l) {
    .product-list {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 70px 25px;
    }
  }
</style>
