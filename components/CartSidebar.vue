<script setup lang="ts">
  import { computed } from 'vue'
  import { useCartStore } from '~/stores/cartStore'
  import { onMounted } from 'vue'
  const cartStore = useCartStore()

  const formattedSubtotal = computed(() => {
    return cartStore.subtotal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  })

  onMounted(() => {
    cartStore.loadCart()
  })
</script>

<template>
  <Transition name="cart-sidebar">
    <div v-if="cartStore.isSidebarOpen" class="cart-sidebar">
      <div class="cart-sidebar__overlay" @click="cartStore.closeSidebar"></div>

      <aside class="cart-sidebar__panel">
        <button
          class="cart-sidebar__close"
          type="button"
          aria-label="Close shopping bag"
          @click="cartStore.closeSidebar"
        >
          <span aria-hidden="true" class="cart-sidebar__back-icon"></span>
        </button>
        <h2 class="cart-sidebar__title">Shopping bag</h2>
        <p class="cart-sidebar__count">{{ cartStore.totalItems }} items</p>

        <p v-if="cartStore.items.length === 0" class="cart-sidebar__empty">
          Your shopping bag is empty
        </p>

        <ul v-else class="cart-sidebar__list">
          <CartSidebarItem
            v-for="item in cartStore.items"
            :key="item.product.id"
            :item="item"
            @remove="cartStore.removeItem"
            @update-quantity="cartStore.updateQuantity"
          />
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
    width: min(100%, 540px);
    height: 100vh;
    padding: 90px 54px 27px;
    background: $color-white;
    box-shadow: -1px 0 0 $color-gray;
  }

  .cart-sidebar__close {
    position: absolute;
    top: 92px;
    right: 40px;
    display: none;
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

  @media (max-width: $breakpoints-s) {
    .cart-sidebar__panel {
      width: 100%;
      height: 100dvh;
      padding: max(16px, env(safe-area-inset-top)) 18px 0;
      overflow: hidden;
      box-shadow: none;
    }

    .cart-sidebar__close {
      top: max(8px, env(safe-area-inset-top));
      right: auto;
      left: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      color: $color-black;
    }

    .cart-sidebar__back-icon {
      width: 13px;
      height: 13px;
      border-bottom: 2px solid currentcolor;
      border-left: 2px solid currentcolor;
      transform: rotate(45deg);
    }

    .cart-sidebar__title {
      flex-shrink: 0;
      padding: 0 32px;
      font-size: 18px;
      line-height: 28px;
      text-align: center;
    }

    .cart-sidebar__count {
      flex-shrink: 0;
      margin-top: 26px;
      font-size: 12px;
      line-height: 20px;
    }

    .cart-sidebar__list {
      gap: 28px;
      min-height: 0;
      margin-top: 8px;
      overscroll-behavior-y: contain;
    }

    .cart-sidebar__footer {
      flex-shrink: 0;
      padding: 24px 18px max(42px, env(safe-area-inset-bottom));
      margin: 0 -18px;
      background: $color-white;
    }

    .cart-sidebar__subtotal {
      gap: 12px;
      font-size: 14px;
      font-weight: $font-weight-medium;
      line-height: 24px;
    }

    .cart-sidebar__checkout {
      min-height: 36px;
      margin-top: 16px;
      font-size: 14px;
      font-weight: $font-weight-regular;
    }
  }
</style>
