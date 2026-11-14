<script setup lang="ts">
  import type { Product } from '~/types/api'
  import { ref, watch } from 'vue'
  import { useRouter } from '#app'

  const props = defineProps<{
    product: Product
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    addToCart: [product: Product]
  }>()
  const router = useRouter()

  const imageFailed = ref(false)
  watch(
    () => props.product.image,
    () => {
      imageFailed.value = false
    },
  )

  const handleCardClick = () => {
    router.push(`/products/${props.product.id}`)
  }
</script>

<template>
  <section class="product-card" @click="handleCardClick">
    <div class="product-card__preview">
      <img
        v-if="product.image && !imageFailed"
        class="product-card__image"
        :src="product.image"
        :alt="product.title"
        loading="lazy"
        @error="imageFailed = true"
      />
      <span v-else class="product-card__image-fallback">Image unavailable</span>
      <BaseButton
        class="product-card__button"
        button-type="button"
        :disabled="disabled"
        :aria-busy="disabled || undefined"
        @click.stop="emit('addToCart', product)"
      >
        ADD TO CART
      </BaseButton>
    </div>

    <h2 class="product-card__title">
      <NuxtLink
        :to="`/products/${product.id}`"
        class="product-card__link"
        :title="product.title"
        @click.stop
        >{{ product.title }}</NuxtLink
      >
    </h2>

    <p class="product-card__price">$ {{ product.price }}</p>
  </section>
</template>
<style lang="scss" scoped>
  .product-card__image {
    display: block;
    width: 100%;
    height: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    background: $color-light-gray;
  }

  .product-card__preview {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    background: $color-light-gray;
    border-radius: 8px;

    @media (width < $breakpoints-m) {
      border-radius: 4px;
    }
  }

  .product-card {
    min-width: 0;
  }

  .product-card__image-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 8px;
    font-size: 12px;
    line-height: 20px;
    color: $color-dark-gray;
    text-align: center;
  }

  .product-card__button {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    min-height: 64px;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-bold;
    line-height: 20px;
    color: $color-black;
    pointer-events: none;
    background: rgb(255 255 255 / 50%);
    opacity: 0;
    transition-duration: 0.6s;
    transition-property: opacity;

    @media (width < $breakpoints-m) {
      min-height: 36px;
      font-size: 12px;
      line-height: 20px;
      pointer-events: auto;
      opacity: 1;
    }

    @media (hover: none) and (pointer: coarse) {
      pointer-events: auto;
      opacity: 1;
    }
  }

  .product-card:focus-within .product-card__button {
    pointer-events: auto;
    opacity: 1;
  }

  @media (hover: hover) and (pointer: fine) {
    .product-card:hover .product-card__button {
      pointer-events: auto;
      opacity: 1;
    }
  }

  .product-card__title {
    display: -webkit-box;
    margin: 24px 0 0;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;
    color: $color-black;
    text-align: left;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;

    @media (width < $breakpoints-m) {
      margin-top: 6px;
      font-size: 14px;
      line-height: 22px;
    }
  }

  .product-card__link {
    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: -2px;
    }
  }

  .product-card__price {
    margin-top: 16px;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-medium;
    font-variant-numeric: tabular-nums;
    line-height: 26px;
    color: $color-accent;

    @media (width < $breakpoints-m) {
      margin-top: 4px;
      font-size: 12px;
      font-weight: $font-weight-regular;
      line-height: 20px;
    }
  }
</style>
