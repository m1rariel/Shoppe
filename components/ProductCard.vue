<script setup lang="ts">
  import type { Product } from '~/types/api'
  import { ref } from 'vue'
  import { useRouter } from '#app'
  import { useIsMobile } from '#imports'

  const props = defineProps<{
    product: Product
  }>()

  const emit = defineEmits<{
    addToCart: [product: Product]
  }>()
  const router = useRouter()

  const isActive = ref(false)

  const handleCardClick = () => {
    if (!useIsMobile()) {
      return
    }
    if (!isActive.value) {
      isActive.value = true
      return
    }

    router.push(`/products/${props.product.id}`)
  }
</script>

<template>
  <section
    class="product-card"
    :class="{ 'product-card--active': isActive }"
    @click="handleCardClick"
  >
    <div class="product-card__preview">
      <img class="product-card__image" :src="product.image" :alt="product.title" />
      <BaseButton
        class="product-card__button"
        button-type="button"
        @click="emit('addToCart', product)"
      >
        Add to cart
      </BaseButton>
    </div>

    <h2 class="product-card__title">
      {{ product.title }}
    </h2>

    <p class="product-card__price">$ {{ product.price }}</p>
  </section>
</template>
<style lang="scss" scoped>
  .product-card__image {
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    background: $color-light-gray;
    border-radius: 8px;
  }

  .product-card__preview {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
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
  }

  .product-card--active .product-card__button,
  .product-card:hover .product-card__button,
  .product-card:focus .product-card__button {
    pointer-events: auto;
    opacity: 1;
  }

  .product-card__title {
    display: -webkit-box;
    margin-top: 24px;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;
    color: $color-black;
    text-align: left;
    letter-spacing: 0%;
    -webkit-box-orient: vertical;
  }

  .product-card__price {
    margin-top: 16px;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-medium;
    color: $color-accent;
    text-transform: capitalize;
    letter-spacing: 0%;
  }
</style>
