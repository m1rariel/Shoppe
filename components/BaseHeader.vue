<script setup lang="ts">
  import SearchIcon from '@/assets/icons/search-icon.svg'
  import PeopleIcon from '@/assets/icons/people-icon.svg'
  import StoreIcon from '@/assets/icons/shop-icon.svg'
  import { useState } from '#app'

  const isEmailSaved = useState('isEmailSaved', () => false)
</script>
<template>
  <div class="page-header-inner container">
    <header class="page-header">
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
          <BaseButton type="transparent">
            <SearchIcon class="icon-button__nav" />
          </BaseButton>
          <BaseButton type="transparent">
            <PeopleIcon class="icon-button__nav" />
          </BaseButton>
          <BaseButton type="transparent">
            <StoreIcon class="icon-button__nav" />
          </BaseButton>
        </nav>
      </div>
    </header>
    <BaseNotification
      v-if="isEmailSaved"
      class="page-header__notification"
      message="Email correctly saved."
      action-text="View cart"
    />
  </div>
</template>

<style lang="scss" scoped>
  .page-header {
    display: none;
    margin-top: 64px;

    @media (min-width: $breakpoints-m) {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .page-header__notification {
    margin-top: 17px;
  }

  .page-header__logo {
    font-family: $font-accent;
    font-size: 35px;
    font-weight: $font-weight-regular;
    user-select: none;

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
