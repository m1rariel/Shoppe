<script setup lang="ts">
  import { ref } from 'vue'
  import StoreIcon from '@/assets/icons/shop-icon.svg'
  import SearchIcon from '@/assets/icons/search-icon.svg'
  import OutIcon from '@/assets/icons/out-icon.svg'
  import PeopleIcon from '@/assets/icons/people-icon.svg'
  import CloseIcon from '@/assets/icons/close-icon.svg'

  const menuLinks = [
    { label: 'Shop', to: '/#shop' },
    { label: 'Blog', to: '/#blog' },
    { label: 'Our Story', to: '/#story' },
    { label: 'Contact', to: '/#contact' },
    { label: 'Terms Of Services', to: '/#terms' },
    { label: 'Shipping And Returns', to: '/#shipping-and-returns' },
  ]
  const menuActionsLink = [
    {
      icon: PeopleIcon,
      label: 'My Account',
      to: '/#account',
    },
    { icon: OutIcon, label: 'Logout', to: '/#logout' },
  ]

  const isMenuOpen = ref(false)

  const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
  }
</script>
<template>
  <div
    class="mobile-menu__outer container-mobile"
    :class="{ 'mobile-menu__outer-open': isMenuOpen }"
  >
    <aside class="mobile-menu">
      <div class="mobile-menu__header">
        <p class="mobile-menu__logo">SHOPPE</p>
        <div class="mobile-menu__actions">
          <BaseButton type="transparent">
            <StoreIcon class="mobile-menu__cart-icon" />
          </BaseButton>
          <BaseButton type="transparent" @click="toggleMenu">
            <CloseIcon v-if="isMenuOpen" class="mobile-menu__close-icon" />
            <div v-else class="mobile-menu-burger">
              <span class="burger-line"> </span>
              <span class="burger-line"> </span>
              <span class="burger-line__small"> </span>
            </div>
          </BaseButton>
        </div>
      </div>
      <div v-if="isMenuOpen" class="mobile-menu__content">
        <label for="" class="mobile-menu__search">
          <span class="mobile-menu__search-icon">
            <SearchIcon class="icon-button" width="12px" height="12px"
          /></span>
          <input type="search" placeholder="Search" />
        </label>
        <nav class="mobile-menu__nav">
          <NuxtLink
            v-for="link in menuLinks"
            :key="link.label"
            :to="link.to"
            class="mobile-menu__link"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <footer class="mobile-menu__footer">
          <div class="mobile-menu__footer-inner">
            <span aria-hidden="true" class="mobile-menu__footer-innner__divider"></span>
            <nav class="mobile-menu__footer-inner__actions">
              <NuxtLink
                v-for="link in menuActionsLink"
                :key="link.label"
                :to="link.to"
                class="mobile-menu__footer-link"
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
    gap: 5px;
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

  .mobile-menu__outer-open {
    position: fixed;
    inset: 0;
    z-index: 10;
    overflow-y: auto;
  }

  .mobile-menu__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .mobile-menu__actions {
    display: flex;
    gap: 21px;
    align-items: center;
    justify-content: center;
    width: auto;
    height: auto;
    color: $color-black;
  }

  .mobile-menu__cart-icon {
    display: block;
    width: 21px;
    height: 21px;
  }

  .mobile-menu__close-icon {
    display: block;
    width: 24px;
    height: 24px;
  }

  .mobile-menu__search {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    min-height: 48px;
    padding: 0 10px;
    background-color: $color-light-gray;
    border-radius: 4px;
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
    margin: 0;
    font-family: $font-accent;
    font-size: 25px;
    font-weight: $font-weight-regular;
    line-height: 40.5px;

    &::first-letter {
      color: $color-accent;
    }
  }

  .mobile-menu__search-icon {
    display: flex;
    flex: 0 0 20px;
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
    font-size: 12px;
    font-weight: $font-weight-regular;
    line-height: 20px;
    color: $color-dark-gray;
    background-color: transparent;
    border: none;

    &::placeholder {
      color: $color-dark-gray;
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
    margin-top: 40px;
  }

  .mobile-menu__footer-innner__divider {
    width: 100%;
    height: 1px;
    margin-top: 24px;
    background-color: $color-gray;
    border: 1px solid $color-gray;
  }

  .container-mobile {
    padding: 0 16px;
    margin: 0 auto;
  }
</style>
