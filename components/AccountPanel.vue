<script setup lang="ts">
  defineProps<{ title: string; mobileTitle?: string }>()
</script>

<template>
  <div class="container">
    <section class="account-panel">
      <h1 class="account-panel__title">
        <span :class="{ 'account-panel__desktop-title': mobileTitle }">{{ title }}</span>
        <span v-if="mobileTitle" class="account-panel__mobile-title">{{ mobileTitle }}</span>
      </h1>
      <slot></slot>
    </section>
  </div>
</template>

<style lang="scss" scoped>
  .account-panel {
    width: 100%;
    max-width: 500px;
    min-height: 440px;
    margin: 40px auto 64px;
    font-family: $font-main;
    font-size: 16px;
    line-height: 27px;
    text-align: center;

    @media (min-width: $breakpoints-m) {
      margin: 120px auto 180px;
    }
  }

  .account-panel__title {
    margin-bottom: 32px;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;

    @media (min-width: $breakpoints-m) {
      margin-bottom: 48px;
      font-size: 33px;
      line-height: 43px;
    }
  }

  .account-panel__desktop-title {
    display: none;

    @media (min-width: $breakpoints-m) {
      display: inline;
    }
  }

  .account-panel__mobile-title {
    @media (min-width: $breakpoints-m) {
      display: none;
    }
  }
</style>
