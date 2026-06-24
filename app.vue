<script setup>
  import BaseNotification from './components/BaseNotification.vue'
  import { useNotificationStore } from './stores/notificationStore'

  const notificationStore = useNotificationStore()
</script>

<template>
  <div class="app">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <BaseNotification v-if="notificationStore.visible && notificationStore.message" />
  </div>
</template>
