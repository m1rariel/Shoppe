<script setup lang="ts">
  import type { NuxtError } from '#app'
  import { clearError } from '#app'
  defineProps<{
    error: NuxtError
  }>()

  const goHome = () => {
    clearError({ redirect: '/' })
  }
</script>
<template>
  <NuxtLayout>
    <div class="error-page">
      <main class="error-page__main container">
        <section class="error-page__content">
          <h1 class="error-page__title">
            <span>4</span>
            <span class="error-page__runaway-zero">0</span>
            <span>4</span>
            <span class="error-page__title-word">ERROR</span>
          </h1>
          <p class="error-page__text">
            This page not found; <br />
            back to home and start again
          </p>

          <BaseButton class="error-page__button" @click="goHome">HOMEPAGE</BaseButton>
        </section>
      </main>
    </div>
  </NuxtLayout>
</template>
<style lang="scss" scoped>
  .error-page__main {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 720px;
    text-align: center;
  }

  .error-page__content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .error-page__title {
    display: inline-flex;
    gap: 8px;
    align-items: baseline;
    margin: 0;
    font-family: $font-main;
    font-size: 33px;
    font-weight: $font-weight-medium;
    line-height: 43px;
    color: $color-black;
  }

  .error-page__runaway-zero {
    display: inline-block;
    color: $color-accent;
    transform-origin: 50% 70%;
    animation: zero-sneak 2.7s ease-in-out infinite;
  }

  .error-page__title-word {
    display: inline-block;
  }

  .error-page__text {
    margin-top: 24px;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    color: $color-dark-gray;
    text-align: center;
  }

  .error-page__button {
    padding: 16px 49px;
    margin-top: 64px;
    border: 1px solid $color-black;
    border-radius: 4px;
  }

  @keyframes zero-sneak {
    0%,
    28%,
    100% {
      transform: translateX(0) rotate(0deg);
    }

    36% {
      transform: translateX(5px) rotate(8deg);
    }

    45% {
      transform: translateX(-10px) translateY(4px) rotate(-14deg) scale(1.1, 0.9);
    }

    58% {
      transform: translateX(2px) rotate(5deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .error-page__runaway-zero {
      animation: none;
    }
  }

  .error-page__button:hover {
    background-color: $color-light-gray;
    opacity: 0.5;
    transition-duration: 0.5s;
  }
</style>
