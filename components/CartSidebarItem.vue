<script setup lang="ts">
  defineProps<{
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

  const emit = defineEmits<{
    updateQuantity: [productId: number, quantity: number]
    remove: [productId: number]
  }>()
</script>
<template>
  <li class="cart-sidebar__item">
    <img class="cart-sidebar__image" :src="item.product.image" :alt="item.product.title" />

    <div class="cart-sidebar__info">
      <div class="cart-sidebar__item-header">
        <h3 class="cart-sidebar__product-title">
          {{ item.product.title }}
        </h3>

        <button
          class="cart-sidebar__remove"
          type="button"
          aria-label="Remove item"
          @click="emit('remove', item.product.id)"
        >
          ×
        </button>
      </div>

      <p class="cart-sidebar__meta">{{ item.product.category }}</p>

      <p class="cart-sidebar__price">$ {{ item.product.price }}</p>

      <div class="cart-sidebar__quantity">
        <button
          class="cart-sidebar__quantity-button"
          type="button"
          @click="emit('updateQuantity', item.product.id, item.quantity - 1)"
        >
          -
        </button>

        <span>{{ item.quantity }}</span>

        <button
          class="cart-sidebar__quantity-button"
          type="button"
          @click="emit('updateQuantity', item.product.id, item.quantity + 1)"
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
    grid-template-columns: 204px minmax(0, 1fr);
    gap: 12px;
    margin-top: 5px;
  }

  .cart-sidebar__image {
    width: 204px;
    height: 204px;
    object-fit: cover;
    background: $color-light-gray;
    border-radius: 4px;
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
  }

  .cart-sidebar__product-title {
    margin: 0;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 26px;
    color: $color-black;
  }

  .cart-sidebar__meta {
    margin-top: 6px;
    font-family: $font-main;
    font-size: 16px;
    line-height: 24px;
    color: $color-dark-gray;
    text-transform: capitalize;
  }

  .cart-sidebar__price {
    margin-top: 4px;
    font-family: $font-main;
    font-size: 14px;
    line-height: 22px;
    color: $color-accent;
    text-align: left;
  }

  .cart-sidebar__quantity {
    display: inline-flex;
    gap: 28px;
    align-items: center;
    align-self: flex-end;
    justify-content: center;
    min-width: 153px;
    min-height: 49px;
    padding: 0 19px;
    margin-top: auto;
    font-family: $font-main;
    font-size: 16px;
    line-height: 24px;
    color: $color-dark-gray;
    background: $color-light-gray;
    border-radius: 4px;
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
  }

  @media (max-width: $breakpoints-s) {
    .cart-sidebar__item {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.06fr);
      gap: 8px;
      margin-top: 0;
    }

    .cart-sidebar__image {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
    }

    .cart-sidebar__item-header {
      gap: 4px;
    }

    .cart-sidebar__product-title {
      font-size: 14px;
      line-height: 20px;
      overflow-wrap: anywhere;
    }

    .cart-sidebar__remove {
      width: 16px;
      height: 20px;
      font-size: 18px;
    }

    .cart-sidebar__meta {
      margin-top: 4px;
      font-size: 14px;
      line-height: 20px;
    }

    .cart-sidebar__price {
      margin-top: 2px;
      line-height: 20px;
      color: $color-dark-gray;
    }

    .cart-sidebar__quantity {
      gap: 8px;
      min-width: 95px;
      min-height: 39px;
      padding: 0 8px;
      font-size: 14px;
    }
  }
</style>
