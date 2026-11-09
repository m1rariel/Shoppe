<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from '#imports'
  import SearchIcon from '@/assets/icons/search-icon.svg'
  import PeopleIcon from '@/assets/icons/people-icon.svg'
  import StoreIcon from '@/assets/icons/shop-icon.svg'
  import { useCartStore } from '~/stores/cartStore'

  const cartStore = useCartStore()
  const route = useRoute()
  const hasDivider = computed(() => route.path !== '/')
  const isShopActive = computed(
    () => route.path === '/products' || route.path.startsWith('/products/'),
  )
  const navigationLinks = [
    { label: 'Shop', to: '/products' },
    { label: 'Blog', to: '/#' },
    { label: 'Our Story', to: '/#' },
  ]
</script>
<template>
  <div class="page-header-inner container">
    <header
      class="page-header"
      :class="{ 'page-header--divided': hasDivider, 'page-header--home': !hasDivider }"
    >
      <div class="page-header__left">
        <p class="page-header__logo">SHOPPE</p>
      </div>
      <div class="page-header__right">
        <nav class="page-header-nav__actions" aria-label="Main navigation">
          <NuxtLink
            v-for="link in navigationLinks"
            :key="link.label"
            :to="link.to"
            class="page-header__link"
            :class="{ 'page-header__link--active': link.to === '/products' && isShopActive }"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <span aria-hidden="true" class="divider"></span>
        <div class="page-header-nav__buttons">
          <BaseButton variant="transparent" aria-label="Search">
            <SearchIcon class="icon-button__nav icon-button__nav--search" aria-hidden="true" />
          </BaseButton>
          <BaseButton
            variant="transparent"
            aria-label="Open shopping bag"
            @click="cartStore.toggleSidebar"
          >
            <StoreIcon class="icon-button__nav icon-button__nav--cart" aria-hidden="true" />
          </BaseButton>
          <BaseButton variant="transparent" aria-label="My account">
            <PeopleIcon class="icon-button__nav" aria-hidden="true" />
          </BaseButton>
        </div>
      </div>
    </header>
  </div>
</template>

<style lang="scss" scoped>
  .page-header {
    position: relative;
    display: none;
    min-height: 42px;
    margin-top: 48px;

    @media (min-width: $breakpoints-m) {
      display: flex;
      gap: 24px;
      align-items: center;
      justify-content: space-between;
    }
  }

  .page-header--divided {
    margin-bottom: 18px;

    &::after {
      position: absolute;
      right: 0;
      bottom: -18px;
      left: 0;
      height: 1px;
      content: '';
      background-color: $color-gray;
    }
  }

  .page-header--home {
    margin-top: 64px;
  }

  .page-header__left {
    flex-shrink: 0;
  }

  .page-header__logo {
    font-family: $font-accent;
    font-size: 35px;
    font-weight: $font-weight-regular;
    line-height: 40.5px;
    user-select: none;

    &::first-letter {
      color: $color-accent;
    }
  }

  .divider {
    flex: 0 0 1px;
    height: 17px;
    margin-right: -1px;
    background-color: $color-dark-gray;
  }

  .page-header__right {
    display: flex;
    flex-shrink: 0;
    gap: 48px;
    align-items: center;

    @media (max-width: $breakpoints-l) {
      gap: 24px;
    }
  }

  .page-header-nav__actions {
    display: flex;
    gap: 64px;
    align-items: center;
    height: 42px;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;

    @media (max-width: $breakpoints-l) {
      gap: 24px;
    }
  }

  .page-header__link {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
    white-space: nowrap;
  }

  .page-header__link--active::after {
    position: absolute;
    bottom: -18px;
    left: 50%;
    z-index: 1;
    width: 40px;
    height: 2px;
    content: '';
    background-color: $color-black;
    transform: translateX(-50%);
  }

  .icon-button__nav {
    display: block;
    width: 20px;
    height: 20px;
  }

  .icon-button__nav--search {
    width: 19px;
    height: 19px;
  }

  .icon-button__nav--cart {
    width: 21px;
    height: 21px;
  }

  .page-header-nav__buttons {
    display: flex;
    gap: 39px;
    align-items: center;

    @media (max-width: $breakpoints-l) {
      gap: 24px;
    }
  }
</style>
