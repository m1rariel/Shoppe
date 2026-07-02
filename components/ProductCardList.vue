<script setup lang="ts">
  import type { Product } from '~/types/api'
  import ProductCard from './ProductCard.vue'

  defineProps<{
    products: Product[]
  }>()

  const emit = defineEmits<{
    addToCart: [product: Product]
  }>()
</script>
<template>
  <div class="product-list">
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
      @add-to-cart="emit('addToCart', product)"
    />
  </div>
</template>
<style lang="scss" scoped>
  @use '~/assets/styles/breakpoints' as *;

  .product-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
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
