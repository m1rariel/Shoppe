<script setup lang="ts">
  import { computed } from 'vue'
  import { useCartStore } from '~/stores/cartStore'

  const cartStore = useCartStore()

  const formattedSubtotal = computed(() => {
    return cartStore.subtotal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  })
</script>

<template>
  <Transition name="cart-sidebar">
    <div v-if="cartStore.isSidebarOpen" class="cart-sidebar">
      <div class="cart-sidebar__overlay" @click="cartStore.closeSidebar"></div>

      <aside class="cart-sidebar__panel">
        <h2 class="cart-sidebar__title">Shopping bag</h2>
        <p class="cart-sidebar__count">{{ cartStore.totalItems }} items</p>

        <p v-if="cartStore.items.length === 0" class="cart-sidebar__empty">
          Your shopping bag is empty
        </p>

        <ul v-else class="cart-sidebar__list">
          <li v-for="item in cartStore.items" :key="item.product.id" class="cart-sidebar__item">
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
                  @click="cartStore.removeItem(item.product.id)"
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
                  @click="cartStore.updateQuantity(item.product.id, item.quantity - 1)"
                >
                  -
                </button>

                <span>{{ item.quantity }}</span>

                <button
                  class="cart-sidebar__quantity-button"
                  type="button"
                  @click="cartStore.updateQuantity(item.product.id, item.quantity + 1)"
                >
                  +
                </button>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="cartStore.items.length > 0" class="cart-sidebar__footer">
          <div class="cart-sidebar__subtotal">
            <span>Subtotal ({{ cartStore.totalItems }} items)</span>
            <span>$ {{ formattedSubtotal }}</span>
          </div>

          <NuxtLink class="cart-sidebar__checkout" to="/checkout" @click="cartStore.closeSidebar">
            CHECKOUT
          </NuxtLink>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
  .cart-sidebar {
    position: fixed;
    inset: 0;
    z-index: 100;
  }

  .cart-sidebar__overlay {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 16%);
  }

  .cart-sidebar__panel {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    width: min(100%, 360px);
    height: 100vh;
    padding: 90px 36px 27px;
    background: $color-white;
    box-shadow: -1px 0 0 $color-gray;
  }

  .cart-sidebar__close {
    position: absolute;
    top: 92px;
    right: 40px;
    font-family: $font-main;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    background: transparent;
    border: none;
  }

  .cart-sidebar__title {
    margin: 0;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
    text-align: left;
    letter-spacing: 0%;
  }

  .cart-sidebar-enter-active {
    transition: opacity 0.2s ease;

    .cart-sidebar__panel {
      transition: transform 0.2s ease;
    }
  }

  .cart-sidebar-leave-active {
    transition: opacity 0.2s ease;

    .cart-sidebar__panel {
      transition: transform 0.2s ease;
    }
  }

  .cart-sidebar-enter-from,
  .cart-sidebar-leave-to {
    opacity: 0;

    .cart-sidebar__panel {
      transform: translateX(100%);
    }
  }

  .cart-sidebar__count {
    margin-top: 17px;
    font-family: $font-main;
    font-size: 16px;
    line-height: 27px;
    color: $color-dark-gray;
  }

  .cart-sidebar__empty {
    margin-top: 32px;
    font-family: $font-main;
    font-size: 16px;
    color: $color-dark-gray;
  }

  .cart-sidebar__list {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 24px;
    padding: 0;
    margin-top: 10px;
    overflow-y: auto;
    list-style: none;
  }

  .cart-sidebar__item {
    display: grid;
    grid-template-columns: 136px minmax(0, 1fr);
    gap: 10px;
    margin-top: 5px;
  }

  .cart-sidebar__image {
    width: 136px;
    height: 136px;
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
    align-items: center;
    align-self: flex-end;
    justify-content: space-between;
    min-width: 102px;
    min-height: 36px;
    padding: 0 14px;
    margin-top: auto;
    font-family: $font-main;
    font-size: 16px;
    line-height: 24px;
    color: $color-dark-gray;
    background: $color-light-gray;
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

  .cart-sidebar__footer {
    padding-top: 30px;
    margin-top: 28px;
    border-top: 1px solid $color-gray;
  }

  .cart-sidebar__subtotal {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
    letter-spacing: 0%;
  }

  .cart-sidebar__checkout {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    margin-top: 21px;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-bold;
    line-height: 20px;
    color: $color-black;
    text-decoration: none;
    background: $color-white;
    border: 1px solid $color-black;
    border-radius: 4px;
  }
</style>
