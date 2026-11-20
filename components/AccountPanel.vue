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
    margin: 21px auto 0;
    font-family: $font-main;
    font-size: 12px;
    line-height: 20px;
    text-align: center;

    @media (min-width: $breakpoints-m) {
      margin-top: 143px;
      font-size: 16px;
      line-height: 27px;
    }
  }

  .account-panel__title {
    margin-bottom: 24px;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;

    @media (min-width: $breakpoints-m) {
      margin-bottom: 64px;
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
