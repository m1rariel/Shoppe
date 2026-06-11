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
    top: 0;
    right: 0;
    left: 0;
    z-index: 1000;
  }
</style>
