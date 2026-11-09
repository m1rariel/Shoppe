<script setup lang="ts">
  import { computed, ref, watch } from 'vue'

  const props = defineProps<{
    busy?: boolean
    item: {
      product: {
        id: number
        title: string
        image?: string
        category: string
        price: number
      }
      quantity: number
    }
  }>()

  const imageFailed = ref(false)
  watch(
    () => props.item.product.image,
    () => {
      imageFailed.value = false
    },
  )
  const formattedPrice = computed(() =>
    props.item.product.price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  )

  const emit = defineEmits<{
    adjustQuantity: [productId: number, delta: number]
    remove: [productId: number]
  }>()
</script>
<template>
  <li class="cart-sidebar__item">
    <img
      v-if="item.product.image && !imageFailed"
      class="cart-sidebar__image"
      :src="item.product.image"
      :alt="item.product.title"
      @error="imageFailed = true"
    />
    <div
      v-else
      class="cart-sidebar__image cart-sidebar__image--fallback"
      role="img"
      :aria-label="`Image unavailable for ${item.product.title}`"
    >
      Image unavailable
    </div>

    <div class="cart-sidebar__info">
      <div class="cart-sidebar__item-header">
        <h3 class="cart-sidebar__product-title">
          {{ item.product.title }}
        </h3>

        <button
          class="cart-sidebar__remove"
          type="button"
          :disabled="busy"
          :aria-label="`Remove ${item.product.title} from shopping bag`"
          @click="emit('remove', item.product.id)"
        >
          ×
        </button>
      </div>

      <p class="cart-sidebar__meta">{{ item.product.category }}</p>

      <p class="cart-sidebar__price">$ {{ formattedPrice }}</p>

      <div class="cart-sidebar__quantity">
        <button
          class="cart-sidebar__quantity-button"
          type="button"
          :disabled="busy"
          :aria-label="`Decrease quantity of ${item.product.title}`"
          @click="emit('adjustQuantity', item.product.id, -1)"
        >
          -
        </button>

        <span>{{ item.quantity }}</span>

        <button
          class="cart-sidebar__quantity-button"
          type="button"
          :disabled="busy"
          :aria-label="`Increase quantity of ${item.product.title}`"
          @click="emit('adjustQuantity', item.product.id, 1)"
        >
          +
        </button>
      </div>
    </div>
  </li>
</template>
<style lang="scss" scoped>
  .cart-sidebar__item {
    display: grid;
    flex-shrink: 0;
    grid-template-columns: 136px minmax(0, 1fr);
    gap: 8px;
    margin-top: 0;

    @media (width < $breakpoints-m) {
      flex-shrink: 0;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.06fr);
      gap: 8px;
      margin-top: 0;
    }
  }

  .cart-sidebar__image {
    width: 136px;
    height: 136px;
    object-fit: cover;
    background: $color-light-gray;
    border-radius: 4px;

    @media (width < $breakpoints-m) {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
      margin-top: 2px;
    }
  }

  .cart-sidebar__image--fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    font-size: 12px;
    color: $color-dark-gray;
    text-align: center;
  }

  .cart-sidebar__info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .cart-sidebar__item-header {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;

    @media (width < $breakpoints-m) {
      gap: 4px;
    }
  }

  .cart-sidebar__product-title {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-family: $font-main;
    font-size: 14px;
    font-weight: $font-weight-regular;
    line-height: 22px;
    color: $color-black;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;

    @media (width < $breakpoints-m) {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      font-size: 12px;
      line-height: 20px;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
    }
  }

  .cart-sidebar__meta {
    display: -webkit-box;
    margin-top: 0;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-family: $font-main;
    font-size: 14px;
    line-height: 22px;
    color: $color-dark-gray;
    text-transform: capitalize;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;

    @media (width < $breakpoints-m) {
      display: -webkit-box;
      margin-top: 1px;
      overflow: hidden;
      -webkit-line-clamp: 2;
      font-size: 12px;
      line-height: 20px;
      -webkit-box-orient: vertical;
    }
  }

  .cart-sidebar__price {
    margin-top: 0;
    font-family: $font-main;
    font-size: 14px;
    line-height: 22px;
    color: $color-accent;
    text-align: left;

    @media (width < $breakpoints-m) {
      margin-top: 0;
      font-size: 12px;
      line-height: 20px;
      color: $color-dark-gray;
    }
  }

  .cart-sidebar__quantity {
    display: inline-flex;
    gap: 12px;
    align-items: center;
    align-self: flex-end;
    justify-content: center;
    min-width: 102px;
    min-height: 33px;
    padding: 0 9px;
    margin-top: auto;
    font-family: $font-main;
    font-size: 12px;
    line-height: 20px;
    color: $color-dark-gray;
    background: $color-light-gray;
    border-radius: 4px;

    @media (width < $breakpoints-m) {
      gap: 4px;
      min-width: 84px;
      min-height: 34px;
      padding: 0 8px;
      font-size: 14px;
    }
  }

  .cart-sidebar__quantity-button {
    width: 20px;
    height: 20px;
    padding: 0;
    font-family: $font-main;
    font-size: 16px;
    color: $color-dark-gray;
    background: transparent;
    border: none;
  }

  .cart-sidebar__remove {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    padding: 0;
    font-family: $font-main;
    font-size: 20px;
    line-height: 1;
    color: $color-black;
    background: transparent;
    border: none;

    @media (width < $breakpoints-m) {
      width: 16px;
      height: 20px;
      font-size: 18px;
    }
  }

  .cart-sidebar__quantity-button:disabled,
  .cart-sidebar__remove:disabled {
    cursor: wait;
    opacity: 0.4;
  }
</style>
