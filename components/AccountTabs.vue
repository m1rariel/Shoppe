<script setup lang="ts">
  const model = defineModel<string>({ required: true })

  const tabs = [
    { value: 'sign-in', label: 'Sign In' },
    { value: 'register', label: 'Register' },
  ]
</script>

<template>
  <div class="account-tabs" aria-label="Account options">
    <BaseButton
      v-for="tab in tabs"
      :key="tab.value"
      :aria-pressed="model === tab.value"
      class="account-tabs__button"
      @click="model = tab.value"
      >{{ tab.label }}</BaseButton
    >
  </div>
</template>

<style lang="scss" scoped>
  .account-tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    margin-bottom: 80px;
    background-color: $color-light-gray;
    border-radius: 8px;

    @media (min-width: $breakpoints-m) {
      margin-bottom: 126px;
    }
  }

  .account-tabs__button {
    flex: 1;
    min-height: 24px;
    padding: 2px 10px;
    background-color: transparent;
    border-radius: 4px;

    @media (min-width: $breakpoints-m) {
      min-height: 50px;
      padding: 10px;
    }

    &[aria-pressed='true'] {
      background-color: $color-white;
    }
  }
</style>
