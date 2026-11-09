<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useCartStore } from '~/stores/cartStore'
  const cartStore = useCartStore()
  const panel = ref<HTMLElement | null>(null)
  const closeButton = ref<HTMLButtonElement | null>(null)
  const leavingItems = ref(0)
  const pendingLeaves = new Set<Element>()
  let previousFocus: HTMLElement | null = null
  let previousOverflow: string | undefined

  const restorePage = () => {
    if (previousOverflow === undefined) return
    document.body.style.overflow = previousOverflow
    previousOverflow = undefined
    previousFocus?.focus()
    previousFocus = null
  }
  const syncOpen = async (open: boolean) => {
    if (!open) {
      pendingLeaves.clear()
      leavingItems.value = 0
      return restorePage()
    }
    if (previousOverflow === undefined) {
      previousFocus = document.activeElement as HTMLElement | null
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    await nextTick()
    if (cartStore.isSidebarOpen) closeButton.value?.focus()
  }

  const prepareItemLeave = (element: Element) => {
    pendingLeaves.add(element)
    leavingItems.value = pendingLeaves.size
    const hadFocus = element.contains(document.activeElement)
    ;(element as HTMLElement).inert = true
    if (hadFocus) closeButton.value?.focus()
  }
  const finishItemLeave = (element: Element) => {
    pendingLeaves.delete(element)
    leavingItems.value = pendingLeaves.size
  }
  const prepareItemEnter = (element: Element) => {
    ;(element as HTMLElement).inert = false
  }

  const removeItem = (productId: number) => {
    if (!cartStore.isMutating) cartStore.removeItem(productId)
  }
  const adjustQuantity = (productId: number, delta: number) => {
    if (!cartStore.isMutating) cartStore.adjustQuantity(productId, delta)
  }

  watch(
    () => cartStore.isMutating,
    (busy) => {
      if (!busy || !panel.value) return
      const controls = panel.value.querySelectorAll<HTMLElement>(
        '.cart-sidebar__remove, .cart-sidebar__quantity-button',
      )
      if (Array.from(controls ?? []).includes(document.activeElement as HTMLElement))
        closeButton.value?.focus()
    },
  )

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && cartStore.isSidebarOpen) {
      event.preventDefault()
      cartStore.closeSidebar()
    } else if (event.key === 'Tab' && cartStore.isSidebarOpen) {
      const controls = Array.from(
        panel.value?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((element) => !element.closest('[inert]'))
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      const focusOutsidePanel = !panel.value?.contains(document.activeElement)
      if (focusOutsidePanel) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  watch(() => cartStore.isSidebarOpen, syncOpen, { flush: 'post' })
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    syncOpen(cartStore.isSidebarOpen)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
    restorePage()
  })

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

      <aside
        ref="panel"
        class="cart-sidebar__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-sidebar-title"
      >
        <button
          ref="closeButton"
          class="cart-sidebar__close"
          type="button"
          aria-label="Close shopping bag"
          @click="cartStore.closeSidebar"
        >
          <span aria-hidden="true" class="cart-sidebar__back-icon"></span>
        </button>
        <h2 id="cart-sidebar-title" class="cart-sidebar__title">Shopping bag</h2>
        <p class="cart-sidebar__count">{{ cartStore.totalItems }} items</p>
        <p v-if="cartStore.isMutating" class="cart-sidebar__status" role="status">
          Updating your bag…
        </p>

        <p v-if="cartStore.items.length === 0 && leavingItems === 0" class="cart-sidebar__empty">
          Your shopping bag is empty
        </p>

        <TransitionGroup
          name="cart-item"
          tag="ul"
          class="cart-sidebar__list"
          @before-enter="prepareItemEnter"
          @before-leave="prepareItemLeave"
          @after-leave="finishItemLeave"
          @leave-cancelled="finishItemLeave"
        >
          <CartSidebarItem
            v-for="item in cartStore.items"
            :key="item.product.id"
            :item="item"
            :busy="cartStore.isMutating"
            @remove="removeItem"
            @adjust-quantity="adjustQuantity"
          />
        </TransitionGroup>
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
    background: transparent;

    @media (width < $breakpoints-m) {
      background: rgb(0 0 0 / 16%);
    }
  }

  .cart-sidebar__panel {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    width: min(100%, 360px);
    height: 100dvh;
    padding: 72px 36px 0;
    overflow: hidden;
    background: $color-white;
    box-shadow: -1px 0 0 $color-gray;

    @media (width < $breakpoints-m) {
      width: 100%;
      height: 100dvh;
      padding: max(13px, env(safe-area-inset-top)) 16px 0;
      overflow: hidden;
      box-shadow: none;
    }
  }

  .cart-sidebar__close {
    position: absolute;
    top: 16px;
    right: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-family: $font-main;
    font-size: 20px;
    line-height: 1;
    color: $color-black;
    cursor: pointer;
    background: transparent;
    border: none;

    @media (width < $breakpoints-m) {
      top: max(5px, calc(env(safe-area-inset-top) - 8px));
      right: auto;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      color: $color-black;
    }
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

    @media (width < $breakpoints-m) {
      flex-shrink: 0;
      padding: 0 32px;
      text-align: center;
    }
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
    flex-shrink: 0;
    margin-top: 17px;
    font-family: $font-main;
    font-size: 12px;
    line-height: 20px;
    color: $color-dark-gray;

    @media (width < $breakpoints-m) {
      flex-shrink: 0;
      margin-top: 20px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .cart-sidebar__status {
    flex-shrink: 0;
    margin-top: 4px;
    font-family: $font-main;
    font-size: 12px;
    line-height: 20px;
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
    min-height: 0;
    padding: 0;
    margin: 5px 0 0;
    overflow-y: auto;
    list-style: none;

    @media (width < $breakpoints-m) {
      gap: 22px;
      min-height: 0;
      margin-top: 3px;
      overscroll-behavior-y: contain;
    }
  }

  .cart-item-enter-active,
  .cart-item-leave-active {
    transition:
      opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1),
      transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);

    @media (prefers-reduced-motion: reduce) {
      transition: opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1);
    }
  }

  .cart-item-enter-from,
  .cart-item-leave-to {
    opacity: 0;
    transform: translateX(8px);

    @media (prefers-reduced-motion: reduce) {
      transform: none;
    }
  }

  .cart-sidebar__footer {
    flex-shrink: 0;
    padding: 21px 36px 27px;
    margin: 0 -36px;
    border-top: 1px solid $color-gray;

    @media (width < $breakpoints-m) {
      flex-shrink: 0;
      padding: 23px 16px max(37px, env(safe-area-inset-bottom));
      margin: 0 -16px;
      background: $color-white;
    }
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

    @media (width < $breakpoints-m) {
      gap: 12px;
      font-size: 12px;
      font-weight: $font-weight-medium;
      line-height: 16px;
    }
  }

  .cart-sidebar__checkout {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 53px;
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

    @media (width < $breakpoints-m) {
      min-height: 32px;
      margin-top: 16px;
      font-size: 12px;
      font-weight: $font-weight-regular;
      line-height: 16px;
    }
  }

  .cart-sidebar__back-icon {
    width: 12px;
    height: 12px;
    background:
      linear-gradient(45deg, transparent 44%, currentcolor 44%, currentcolor 56%, transparent 56%),
      linear-gradient(-45deg, transparent 44%, currentcolor 44%, currentcolor 56%, transparent 56%);

    @media (width < $breakpoints-m) {
      width: 11px;
      height: 11px;
      background: none;
      border-bottom: 2px solid currentcolor;
      border-left: 2px solid currentcolor;
      transform: rotate(45deg);
    }
  }
</style>
