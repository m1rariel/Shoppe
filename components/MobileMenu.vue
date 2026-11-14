<script setup lang="ts">
  import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { useIsMobile, useRoute, useRouter } from '#imports'
  import { useCartStore } from '~/stores/cartStore'
  import StoreIcon from '@/assets/icons/shop-icon.svg'
  import OutIcon from '@/assets/icons/out-icon.svg'
  import PeopleIcon from '@/assets/icons/people-icon.svg'
  import CloseIcon from '@/assets/icons/close-icon.svg'
  import SearchIcon from '@/assets/icons/search-icon.svg'

  const menuLinks = [
    { label: 'Shop', to: '/products' },
    { label: 'Blog', to: '/#blog' },
    { label: 'Our Story', to: '/#story' },
    { label: 'Contact', to: '/#contact' },
    { label: 'Terms Of Services', to: '/#terms' },
    { label: 'Shipping And Returns', to: '/#shipping-and-returns' },
  ]
  const menuActionLinks = [
    {
      icon: PeopleIcon,
      label: 'My account',
      to: '/#account',
    },
    { icon: OutIcon, label: 'Logout', to: '/#logout' },
  ]
  const cartStore = useCartStore()
  defineProps<{ hideSearch?: boolean }>()
  const isMenuOpen = ref(false)
  const searchDraft = ref('')
  const panel = ref<HTMLElement | null>(null)
  const searchInput = ref<HTMLInputElement | null>(null)
  const isMobile = useIsMobile()
  const route = useRoute()
  const router = useRouter()
  let previousOverflow: string | undefined
  let previousFocus: HTMLElement | null = null

  const restoreScroll = () => {
    if (previousOverflow !== undefined) {
      document.body.style.overflow = previousOverflow
      previousOverflow = undefined
    }
  }
  const closeMenu = (restoreFocus = true) => {
    if (!isMenuOpen.value) return
    isMenuOpen.value = false
    if (restoreFocus) previousFocus?.focus()
    previousFocus = null
  }
  const toggleMenu = async () => {
    if (isMenuOpen.value) return closeMenu()
    previousFocus = document.activeElement as HTMLElement | null
    isMenuOpen.value = true
    await nextTick()
    if (isMenuOpen.value) searchInput.value?.focus()
  }
  const openCart = () => {
    closeMenu(false)
    cartStore.toggleSidebar()
  }
  const submitSearch = () => {
    const search = searchDraft.value.trim()
    closeMenu()
    return router.push({ path: '/products', query: search ? { search } : {} })
  }
  const handleKeydown = (event: KeyboardEvent) => {
    if (!isMenuOpen.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    } else if (event.key === 'Tab') {
      const controls = panel.value?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled)',
      )
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }
  watch(
    isMenuOpen,
    (open) => {
      if (open) {
        previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else restoreScroll()
    },
    { flush: 'sync' },
  )
  watch(
    () => route.fullPath,
    () => closeMenu(),
  )
  watch(isMobile, (mobile) => {
    if (!mobile) closeMenu(false)
  })
  watch(
    () => cartStore.isSidebarOpen,
    (open) => {
      if (open) closeMenu(false)
    },
    { flush: 'sync' },
  )
  onBeforeUnmount(restoreScroll)
</script>
<template>
  <div
    ref="panel"
    class="mobile-menu__outer container"
    :class="{ 'mobile-menu__outer-open': isMenuOpen }"
    :role="isMenuOpen ? 'dialog' : undefined"
    :aria-modal="isMenuOpen ? true : undefined"
    :aria-label="isMenuOpen ? 'Main menu' : undefined"
    @keydown="handleKeydown"
  >
    <aside class="mobile-menu">
      <header class="mobile-menu__header">
        <NuxtLink to="/" class="mobile-menu__logo" @click="closeMenu()">SHOPPE</NuxtLink>
        <div class="mobile-menu__actions">
          <BaseButton
            variant="transparent"
            class="mobile-menu__cart-button"
            :aria-label="`Open shopping bag (${cartStore.totalItems} items)`"
            @click="openCart"
          >
            <StoreIcon class="mobile-menu__cart-icon" aria-hidden="true" />
            <span
              v-if="cartStore.totalItems > 0"
              class="mobile-menu__cart-count"
              aria-hidden="true"
            >
              {{ cartStore.totalItems }}
            </span>
          </BaseButton>
          <BaseButton
            variant="transparent"
            :aria-label="isMenuOpen ? 'Close menu' : 'Open menu'"
            :aria-expanded="isMenuOpen"
            aria-controls="mobile-navigation"
            @click="toggleMenu"
          >
            <CloseIcon v-if="isMenuOpen" class="mobile-menu__close-icon" aria-hidden="true" />
            <div v-else class="mobile-menu-burger" aria-hidden="true">
              <span class="burger-line"> </span>
              <span class="burger-line"> </span>
              <span class="burger-line__small"> </span>
            </div>
          </BaseButton>
        </div>
      </header>
      <form
        v-if="!hideSearch || isMenuOpen"
        class="mobile-menu__search"
        role="search"
        @submit.prevent="submitSearch"
      >
        <span class="mobile-menu__search-icon" aria-hidden="true">
          <SearchIcon class="icon-button" width="12px" height="12px"
        /></span>
        <input
          ref="searchInput"
          v-model="searchDraft"
          type="search"
          placeholder="Search"
          aria-label="Search products"
        />
      </form>

      <div v-if="isMenuOpen" class="mobile-menu__content">
        <nav id="mobile-navigation" class="mobile-menu__nav" aria-label="Main navigation">
          <NuxtLink
            v-for="link in menuLinks"
            :key="link.label"
            :to="link.to"
            class="mobile-menu__link"
            @click="closeMenu()"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <footer class="mobile-menu__footer">
          <div class="mobile-menu__footer-inner">
            <span aria-hidden="true" class="mobile-menu__footer-innner__divider"></span>
            <nav class="mobile-menu__footer-inner__actions" aria-label="Account navigation">
              <NuxtLink
                v-for="link in menuActionLinks"
                :key="link.label"
                :to="link.to"
                class="mobile-menu__footer-link"
                @click="closeMenu()"
              >
                <component :is="link.icon" class="mobile-menu__footer-icon" aria-hidden="true" />
                <span>{{ link.label }}</span>
              </NuxtLink>
            </nav>
          </div>
        </footer>
      </div>
    </aside>
  </div>
</template>
<style lang="scss" scoped>
  .burger-line {
    width: 20px;
    height: 2px;
  }

  .burger-line__small {
    width: 13px;
    height: 2px;
  }

  .burger-line,
  .burger-line__small {
    background-color: $color-black;
  }

  .mobile-menu-burger {
    display: flex;
    flex-direction: column;
    gap: 4.5px;
    align-items: end;
  }

  .mobile-menu__outer {
    display: block;
    width: 100%;
    max-width: none;
    background-color: $color-white;

    @media (min-width: $breakpoints-m) {
      display: none;
    }
  }

  .mobile-menu__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    margin-bottom: 2px;
  }

  .mobile-menu__actions {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: center;
    width: auto;
    height: auto;
    color: $color-black;
  }

  .mobile-menu__cart-icon {
    display: block;
    width: 18px;
    height: 18px;
  }

  .mobile-menu__cart-button {
    position: relative;
  }

  .mobile-menu__cart-count {
    position: absolute;
    top: -2px;
    right: -3px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 11px;
    height: 11px;
    padding: 0 2px;
    font-family: $font-main;
    font-size: 7px;
    line-height: 1;
    color: $color-black;
    background-color: $color-white;
    border: 1px solid $color-black;
    border-radius: 999px;
  }

  .mobile-menu__close-icon {
    display: block;
    width: 24px;
    height: 24px;
  }

  .mobile-menu,
  .mobile-menu__header,
  .mobile-menu__content,
  .mobile-menu__nav,
  .mobile-menu__footer,
  .mobile-menu__footer-inner,
  .mobile-menu__footer-inner__actions {
    width: 100%;
  }

  .mobile-menu__logo {
    display: block;
    margin: 0;
    font-family: $font-accent;
    font-size: 25px;
    font-weight: $font-weight-regular;
    line-height: 40.5px;
    color: $color-black;

    &::first-letter {
      color: $color-accent;
    }
  }

  .mobile-menu__link {
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;
    color: $color-black;
  }

  .mobile-menu__footer-link {
    display: flex;
    gap: 10px;
    align-items: center;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;
    color: $color-black;
  }

  .mobile-menu__footer-icon {
    display: block;
    flex: 0 0 20px;
    width: 20px;
    height: 20px;
  }

  .mobile-menu {
    &__nav,
    &__footer-inner,
    &__footer-inner__actions {
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-items: start;
    }
  }

  .mobile-menu__nav {
    margin-top: 39px;

    .mobile-menu__link:nth-child(4) {
      margin-bottom: -4px;
    }
  }

  .mobile-menu__footer-inner {
    gap: 24.5px;
  }

  .mobile-menu__footer-innner__divider {
    width: 100%;
    height: 1px;
    margin-top: 23.5px;
    background-color: $color-gray;
  }

  .mobile-menu__search {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    min-height: 32px;
    padding: 0 10px;
    background-color: $color-light-gray;
    border-radius: 4px;
  }

  .mobile-menu__search-icon {
    display: flex;
    flex: 0 0 12px;
    color: $color-dark-gray;
  }

  .icon-button {
    display: block;
  }

  .mobile-menu__search input {
    width: 100%;
    min-width: 0;
    padding: 0;
    font-family: $font-main;
    font-size: 14px;
    font-weight: $font-weight-regular;
    line-height: 22px;
    color: $color-dark-gray;
    background-color: transparent;
    border: none;

    &::placeholder {
      color: $color-dark-gray;
    }
  }

  .mobile-menu__outer-open {
    position: fixed;
    inset: 0;
    z-index: 10;
    padding-bottom: 24px;
    overflow-y: auto;

    .mobile-menu__header {
      margin-bottom: 0;
    }

    .mobile-menu__search input {
      font-size: 12px;
      line-height: 20px;
    }
  }
</style>
