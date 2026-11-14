<script setup lang="ts">
  defineEmits<{ home: [] }>()
</script>

<template>
  <div class="error-page container">
    <section class="error-page__content" aria-labelledby="error-page-title">
      <h1 id="error-page-title" class="error-page__title">404 ERROR</h1>
      <p class="error-page__text">
        <span>This page not found;</span>
        <span>back to home and start again</span>
      </p>
      <BaseButton class="error-page__button" @click="$emit('home')">HOMEPAGE</BaseButton>
    </section>
  </div>
</template>

<style lang="scss" scoped>
  .error-page {
    padding-top: 254px;
    text-align: center;

    @media (width < $breakpoints-m) {
      min-height: calc(100svh - 82px);
      padding-top: 197px;
      padding-bottom: 40px;
    }
  }

  .error-page__content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .error-page__title {
    margin: 0;
    font-family: $font-main;
    font-size: 33px;
    font-weight: $font-weight-medium;
    line-height: 43px;
    color: $color-black;

    @media (width < $breakpoints-m) {
      font-size: 20px;
      line-height: 26px;
    }
  }

  .error-page__text {
    display: flex;
    flex-direction: column;
    min-height: 63px;
    margin-top: 24px;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;
    color: $color-dark-gray;

    @media (width < $breakpoints-m) {
      gap: 10px;
      min-height: 50px;
      margin-top: 10px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .error-page__button {
    width: 187px;
    height: 53px;
    margin-top: 64px;
    font-size: 16px;
    font-weight: $font-weight-bold;
    line-height: 21px;
    color: $color-black;
    background-color: $color-white;
    border: 1px solid $color-black;
    border-radius: 4px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: $color-light-gray;
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 3px;
    }

    @media (width < $breakpoints-m) {
      width: 115px;
      height: 32px;
      margin-top: 18px;
      font-size: 12px;
      font-weight: $font-weight-regular;
      line-height: 20px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }
</style>
