<script setup lang="ts">
  const model = defineModel<string>({ required: true })

  const tabs = [
    { value: 'sign-in', label: 'Sign in' },
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
    gap: 16px;
    padding: 2px;
    margin-bottom: 87px;
    background-color: $color-light-gray;
    border-radius: 5px;

    @media (min-width: $breakpoints-m) {
      gap: 18px;
      padding: 5px;
      margin-bottom: 126px;
      border-radius: 8px;
    }
  }

  .account-tabs__button {
    flex: 1;
    min-height: 28px;
    padding: 2px 10px;
    background-color: transparent;
    border-radius: 5px;

    @media (min-width: $breakpoints-m) {
      min-height: 50px;
      padding: 10px;
      font-size: 20px;
      line-height: 26px;
      border-radius: 8px;
    }

    &:first-child {
      text-transform: lowercase;

      @media (min-width: $breakpoints-m) {
        text-transform: none;
      }
    }

    &[aria-pressed='true'] {
      background-color: $color-white;
      box-shadow: 1px 1px 4px rgb(0 0 0 / 10%);
    }
  }
</style>
