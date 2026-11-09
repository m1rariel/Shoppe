<script setup lang="ts">
  import type { Product } from '~/types/api'

  defineProps<{
    products: Product[]
    loading: boolean
    error: boolean
    pendingIds: number[]
  }>()
  const emit = defineEmits<{
    retry: []
    addToCart: [product: Product]
  }>()
</script>

<template>
  <section
    v-if="loading || error || products.length"
    class="similar-items"
    aria-labelledby="similar-items-title"
    :aria-busy="loading"
  >
    <h2 id="similar-items-title" class="similar-items__title">Similar Items</h2>
    <p v-if="loading" role="status">Loading similar items…</p>
    <div v-else-if="error" role="alert">
      <p>Unable to load similar items.</p>
      <BaseButton class="similar-items__retry" @click="emit('retry')">Try again</BaseButton>
    </div>
    <ProductCardList
      v-else
      variant="similar"
      :products="products"
      :pending-ids="pendingIds"
      @add-to-cart="emit('addToCart', $event)"
    />
  </section>
</template>

<style lang="scss" scoped>
  .similar-items {
    grid-column: 1 / -1;
    min-width: 0;
    margin-top: 34px;

    @media (width < $breakpoints-m) {
      margin-top: 16px;
    }
  }

  .similar-items__title {
    margin: 0 0 47px;
    font-size: 26px;
    font-weight: $font-weight-regular;
    line-height: 35px;

    @media (width < $breakpoints-m) {
      margin-bottom: 24px;
      font-size: 16px;
      line-height: 16px;
    }
  }

  .similar-items__retry {
    min-height: 44px;
    padding: 8px 16px;
    margin-top: 16px;
    border: 1px solid $color-black;
    border-radius: 4px;
  }
</style>
