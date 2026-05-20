<script setup lang="ts">
  const menuLinks = [
    { label: 'Shop', to: '/#shop' },
    { label: 'Blog', to: '/#blog' },
    { label: 'Our Story', to: '/#story' },
    { label: 'Contact', to: '/#contact' },
    { label: 'Terms Of Services', to: '/#terms' },
    { label: 'Shipping And Returns', to: '/#shipping-and-returns' },
  ]
</script>

<template>
  <aside class="mobile-menu">
    <div class="mobile-menu__header">
      <p class="mobile-menu__logo"></p>
      <div class="mobile-menu__actions">
        <button class="mobile-menu__icon-button"></button>
        <button class="mobile-menu__icon-button"></button>
      </div>
    </div>
    <label for="" class="mobile-menu__search">
      <span class="mobile-menu__search-icon"></span>
      <input type="search" placeholder="Search" />
    </label>
    <nav class="mobile-menu__nav">
      <NuxtLink v-for="link in menuLinks" :key="link.label" :to="link.to" class="mobile-menu__link">
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
<style lang="scss" scoped>
  div {
    display: flex;
  }
</style>
