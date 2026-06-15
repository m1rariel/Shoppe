<script setup>
  import BaseNotification from './components/BaseNotification.vue'
  import { useNotificationStore } from './stores/notificationStore'

  const notificationStore = useNotificationStore()
</script>

<template>
  <div class="app">
    <BaseHeader />
    <MobileMenu />
    <NuxtPage />
    <BaseNotification v-if="notificationStore.visible" />
  </div>
</template>
