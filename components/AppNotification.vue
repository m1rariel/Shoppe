<script setup lang="ts">
  import { useNotificationStore } from '@/stores/notificationStore'

  const notificationStore = useNotificationStore()
</script>

<template>
  <Teleport to="body">
    <div v-if="notificationStore.visible" class="app-notification container">
      <BaseNotification :message="notificationStore.message" :type="notificationStore.type" />
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
  .app-notification {
    position: fixed;
    top: 24px;
    right: 0;
    left: 0;
    z-index: 1000;
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
</style>
