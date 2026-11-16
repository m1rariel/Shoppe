<script setup lang="ts">
  import SuccessIcon from '@/assets/icons/succ-icon.svg'
  import ErrorIcon from '@/assets/icons/error-icon.svg'
  import { useNotificationStore } from '@/stores/notificationStore'
  import { nextTick } from 'vue'
  import { useCartStore } from '~/stores/cartStore'

  const notificationStore = useNotificationStore()

  const cartStore = useCartStore()
  const handleAction = async () => {
    if (notificationStore.action !== 'open-cart') return
    notificationStore.hideNotification()
    await nextTick()
    cartStore.toggleSidebar()
  }
</script>
<template>
  <Teleport to="body">
    <div
      v-if="notificationStore.visible && notificationStore.message"
      class="base-notification"
      role="status"
    >
      <div class="container">
        <div class="base-notification__content">
          <div class="base-notification__inner">
            <span class="base-notification-icon">
              <SuccessIcon v-if="notificationStore.type === 'success'" />
              <ErrorIcon v-else-if="notificationStore.type === 'error'" />
            </span>
            <div
              :class="[
                'base-notification__message',
                { 'base-notification__message--error': notificationStore.type === 'error' },
              ]"
            >
              {{ notificationStore.message }}
            </div>
          </div>
          <button
            v-if="notificationStore.action && notificationStore.actionText"
            class="base-notification__action"
            type="button"
            @click="handleAction"
          >
            {{ notificationStore.actionText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<style lang="scss" scoped>
  .base-notification__inner {
    display: flex;
    flex: 1 1 200px;
    gap: 16px;
    min-width: 0;
  }

  .base-notification {
    position: fixed;
    top: 24px;
    right: 0;
    left: 0;
    z-index: 1000;
  }

  .base-notification__content {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background-color: $color-light-gray;
    border-top: 2px solid $color-accent;
    border-radius: 0 0 4px 4px;
    animation: notification-slide-in 0.2s ease;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
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

  .base-notification-icon {
    flex-shrink: 0;
  }

  .base-notification__action {
    flex-shrink: 0;
    min-height: 32px;
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
    overflow-wrap: anywhere;
  }

  .base-notification__message--error {
    color: red;
  }
</style>
