<script setup lang="ts">
  import type { Product } from '~/types/api'
  import { computed, ref, watch } from 'vue'
  import ShareIcon from '~/assets/icons/share-icon.svg'
  import StarIcon from '~/assets/icons/star-icon.svg'
  import { useCartStore } from '~/stores/cartStore'

  const cartStore = useCartStore()

  const quantity = ref(1)
  const isAdding = ref(false)

  const props = defineProps<{
    product: Product
    productUrl: string
  }>()

  const rating = computed(() => {
    const value: unknown = props.product.rating
    if (!value || typeof value !== 'object' || !('rate' in value)) return null
    const rate = value.rate
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 5) return null
    if (
      'count' in value &&
      (typeof value.count !== 'number' || !Number.isSafeInteger(value.count) || value.count <= 0)
    )
      return null
    return rate
  })

  watch(
    () => props.product.id,
    () => {
      quantity.value = 1
    },
  )

  const decreaseQuantity = () => {
    if (quantity.value > 1) {
      quantity.value--
    }
  }

  const handleAddToCart = async () => {
    if (isAdding.value) return
    isAdding.value = true
    try {
      await cartStore.addItem(props.product, quantity.value)
    } finally {
      isAdding.value = false
    }
  }
</script>

<template>
  <div class="product-info">
    <ProductShare v-slot="{ shareProduct }" :product="product" :product-url="productUrl">
      <h1 class="product-info__title">{{ product.title }}</h1>
      <div class="product-info__price-row">
        <p class="product-info__price">$ {{ product.price }}</p>
        <BaseButton class="product-info__share" aria-label="Share product" @click="shareProduct">
          <ShareIcon viewBox="0 0 14 14" aria-hidden="true" />
        </BaseButton>
      </div>

      <div
        v-if="rating !== null"
        class="product-info__rating"
        role="img"
        :aria-label="`${rating} out of 5`"
      >
        <span aria-hidden="true">{{ rating }}</span>
        <span class="product-info__stars" aria-hidden="true">
          <span v-for="star in 5" :key="star" class="product-info__star">
            <StarIcon class="product-info__star-base" />
            <span
              class="product-info__star-fill"
              :style="{ width: `${Math.min(1, Math.max(0, rating - star + 1)) * 100}%` }"
            >
              <StarIcon />
            </span>
          </span>
        </span>
      </div>
      <p v-else class="product-info__rating product-info__rating--empty">No ratings</p>

      <p class="product-info__description">
        {{ product.description }}
      </p>

      <div class="product-info__actions">
        <div class="product-info__quantity">
          <button
            type="button"
            aria-label="Decrease quantity"
            :disabled="quantity <= 1 || isAdding"
            @click="decreaseQuantity"
          >
            −
          </button>

          <span>{{ quantity }}</span>

          <button
            type="button"
            aria-label="Increase quantity"
            :disabled="quantity >= Number.MAX_SAFE_INTEGER || isAdding"
            @click="quantity++"
          >
            +
          </button>
        </div>

        <BaseButton
          class="product-info__add-to-cart"
          :disabled="isAdding"
          :aria-busy="isAdding"
          @click="handleAddToCart"
        >
          {{ isAdding ? 'ADDING…' : 'ADD TO CART' }}
        </BaseButton>
      </div>
    </ProductShare>

    <div class="product-info__details">
      <p>
        <span class="product-info__label">SKU:</span>
        <span>{{ product.id }}</span>
      </p>
      <p>
        <span class="product-info__label">Categories:</span>
        <span>{{ product.category }}</span>
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .product-info {
    min-width: 0;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
  }

  .product-info__title {
    margin: 0;
    font-size: 26px;
    font-weight: $font-weight-regular;
    line-height: 35px;
    overflow-wrap: anywhere;
  }

  .product-info__price-row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 23px;
  }

  .product-info__share {
    display: inline-flex;
    width: 44px;
    height: 44px;
    color: $color-black;
  }

  .product-info__share svg {
    width: 14px;
    height: 14px;
  }

  .product-info__price {
    font-size: 20px;
    font-weight: $font-weight-medium;
    font-variant-numeric: tabular-nums;
    line-height: 26px;
    color: $color-accent;
  }

  .product-info__description {
    margin-top: 64px;
    color: $color-dark-gray;
    overflow-wrap: anywhere;

    @media (width < $breakpoints-m) {
      order: 2;
      margin-top: 16px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .product-info__rating {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 24px;
    font-variant-numeric: tabular-nums;

    @media (width < $breakpoints-m) {
      margin-top: 16px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .product-info__rating--empty {
    color: $color-dark-gray;
  }

  .product-info__stars {
    display: flex;
    gap: 4px;
  }

  .product-info__star {
    position: relative;
    display: block;
    width: 18px;
    height: 18px;
  }

  .product-info__star svg {
    display: block;
    width: 18px;
    height: 18px;
  }

  .product-info__star-base {
    opacity: 0.25;
  }

  .product-info__star-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    overflow: hidden;
  }

  .product-info__actions {
    display: flex;
    gap: 24px;
    margin-top: 48px;

    @media (width < $breakpoints-m) {
      flex-wrap: wrap;
      gap: 8px;
      order: 1;
      margin-top: 24px;
    }
  }

  .product-info__quantity {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    min-width: 102px;
    height: 53px;
    color: $color-dark-gray;
    background-color: $color-light-gray;
    border-radius: 4px;

    @media (width < $breakpoints-m) {
      min-width: 118px;
      height: 44px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      line-height: 20px;
    }
  }

  .product-info__quantity span {
    min-width: 30px;
    text-align: center;
  }

  .product-info__quantity button {
    width: 36px;
    height: 100%;
    color: inherit;
    cursor: pointer;
    transition: color 0.2s ease;

    @media (width < $breakpoints-m) {
      flex-shrink: 0;
      width: 44px;
    }
  }

  .product-info__add-to-cart {
    flex: 1;
    min-width: 0;
    min-height: 53px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 16px;
    font-weight: $font-weight-bold;
    line-height: 22px;
    color: $color-black;
    background-color: transparent;
    border: 1px solid $color-black;
    border-radius: 4px;
    transition:
      color 0.2s ease,
      background-color 0.2s ease;

    @media (width < $breakpoints-m) {
      flex: 1 0 120px;
      min-height: 44px;
      padding: 11px 16px;
      font-size: 12px;
      font-weight: $font-weight-regular;
      line-height: 20px;
    }
  }

  .product-info__details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 40px;

    @media (width < $breakpoints-m) {
      gap: 8px;
      order: 3;
      margin-top: 16px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .product-info__details p {
    display: flex;
    gap: 16px;
    color: $color-dark-gray;
    overflow-wrap: anywhere;

    @media (width < $breakpoints-m) {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 12px;
    }
  }

  .product-info__label {
    flex-shrink: 0;
    color: $color-black;
  }

  @media (width < $breakpoints-m) {
    .product-info {
      display: flex;
      flex-direction: column;
    }

    .product-info__title {
      font-size: 20px;
      line-height: 26px;
    }

    .product-info__price-row {
      min-height: 27px;
      margin-top: 5px;
    }

    .product-info__share {
      position: absolute;
      top: 50%;
      right: -15px;
      display: inline-flex;
      transform: translateY(-50%);
    }

    .product-info__price {
      font-size: 16px;
      line-height: 27px;
    }
  }
</style>
