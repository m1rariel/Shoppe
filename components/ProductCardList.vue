<script setup lang="ts">
  import type { Product } from '~/types/api'
  import ProductCard from './ProductCard.vue'

  defineProps<{
    products: Product[]
    variant?: 'similar'
    pendingIds?: number[]
  }>()

  const emit = defineEmits<{
    addToCart: [product: Product]
  }>()
</script>
<template>
  <div
    class="product-list"
    :class="{ 'product-list--similar': variant === 'similar' }"
    :tabindex="variant === 'similar' ? 0 : undefined"
    :role="variant === 'similar' ? 'region' : undefined"
    :aria-label="variant === 'similar' ? 'Similar products' : undefined"
  >
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
      :disabled="pendingIds?.includes(product.id)"
      @add-to-cart="emit('addToCart', product)"
    />
  </div>
</template>
<style lang="scss" scoped>
  @use '~/assets/styles/breakpoints' as *;

  .product-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;

    @media (min-width: $breakpoints-m) {
      gap: 70px 24px;
    }

    @media (min-width: $breakpoints-l) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .product-list--similar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 54px;

    @media (width < $breakpoints-m) {
      grid-template-columns: none;
      grid-auto-columns: 136px;
      grid-auto-flow: column;
      gap: 12px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
    }
  }
</style>
