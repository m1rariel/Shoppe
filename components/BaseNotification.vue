<script setup lang="ts">
  import SuccessIcon from '@/assets/icons/succ-icon.svg'
  import { useNotificationStore } from '@/stores/notificationStore'

  const notificationStore = useNotificationStore()

  defineProps<{
    message?: string
    actionText?: string
    type?: 'success' | 'error' | 'info'
    visible?: boolean
  }>()
</script>
<template>
  <Teleport to="body">
    <div v-if="notificationStore.visible" class="base-notification container">
      <div class="base-notification__inner">
        <span class="base-notification-icon">
          <SuccessIcon />
        </span>
        <div class="base-notification__message">
          {{ notificationStore.message }}
        </div>
      </div>
      <button v-if="actionText" class="base-notification__action" type="button">
        {{ actionText }}
      </button>
    </div>
  </Teleport>
</template>
<style lang="scss" scoped>
  .base-notification__inner {
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  .base-notification {
    position: fixed;
    top: 24px;
    right: 0;
    left: 0;
    z-index: 1000;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background-color: $color-light-gray;
    border-top: 2px solid $color-accent;
    border-radius: 0 0 4px 4px;
    animation: notification-slide-in 0.6s ease;
  }

  @keyframes notification-slide-in {
    from {
      opacity: 0;
      transform: translateY(-16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
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
