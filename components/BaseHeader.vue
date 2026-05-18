<script setup lang="ts">
  import SearchIcon from '@/assets/icons/search-icon.svg'
  import PeopleIcon from '@/assets/icons/people-icon.svg'
  import StoreIcon from '@/assets/icons/shop-icon.svg'
</script>
<template>
  <header class="page-header">
    <div class="page-header__inner container">
      <div class="page-header__left">
        <p class="page-header__logo">SHOPPE</p>
      </div>
      <div class="page-header__right">
        <nav class="page-header-nav__actions">
          <NuxtLink to="/#">Shop</NuxtLink>
          <NuxtLink to="/#">Blog</NuxtLink>
          <NuxtLink to="/#">Our Story</NuxtLink>
        </nav>
        <span aria-hidden="true" class="divider"></span>
        <nav class="page-header-nav__buttons">
          <button type="button"><SearchIcon class="icon-button__nav" /></button>
          <button type="button"><PeopleIcon class="icon-button__nav" /></button>
          <button type="button"><StoreIcon class="icon-button__nav" /></button>
        </nav>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
  @use '~/assets/styles/variables' as *;

  .page-header__inner {
    display: flex;
    justify-content: space-between;
  }

  .page-header__logo {
    font-family: $font-accent;
    font-size: 35px;
    font-weight: $font-weight-regular;

    &::first-letter {
      color: $color-accent;
    }
  }

  .divider {
    width: 17px;
    height: 0;
    border: 1px solid $color-dark-gray;
    transform: rotate(90deg);
  }

  .page-header__right {
    display: flex;
    gap: 49px;
    align-items: center;
  }

  .page-header-nav__actions {
    display: flex;
    gap: 68px;
    align-items: center;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
  }

  .icon-button__nav {
    width: 20px;
    height: 20px;
  }

  .page-header-nav__buttons {
    display: flex;
    gap: 39px;
    align-items: center;
  }
</style>
