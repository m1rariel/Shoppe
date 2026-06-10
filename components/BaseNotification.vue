<script setup lang="ts">
  import SuccessIcon from '@/assets/icons/succ-icon.svg'

  defineProps<{
    message: string
    actionText: string
  }>()
</script>
<template>
  <div class="base-notification">
    <div class="base-notification__inner">
      <span class="base-notification-icon">
        <SuccessIcon />
      </span>
      <div class="base-notification__message">
        {{ message }}
      </div>
    </div>
    <button v-if="actionText" class="base-notification__action" type="button">
      {{ actionText }}
    </button>
  </div>
</template>
<style lang="scss" scoped>
  .base-notification__inner {
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  .base-notification {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background-color: $color-light-gray;
    border-top: 2px solid $color-accent;
    border-radius: 0 0 4px 4px;
  }

  .base-notification__action {
    font-family: $font-main;
    font-size: 14px;
    font-weight: $font-weight-bold;
    color: $color-accent;
    text-transform: uppercase;
  }

  .base-notification__message {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;
  }
</style>
