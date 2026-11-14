<script setup lang="ts">
  import type { NuxtError } from '#app'
  import { clearError } from '#app'
  import { useNotificationStore } from '@/stores/notificationStore'

  const notificationStore = useNotificationStore()

  defineProps<{
    error: NuxtError
  }>()

  const goHome = () => {
    clearError({ redirect: '/' })
  }
</script>

<template>
  <div class="error-layout">
    <NuxtLayout>
      <ErrorContent @home="goHome" />
    </NuxtLayout>
    <BaseNotification v-if="notificationStore.visible && notificationStore.message" />
    <CartSidebar />
  </div>
</template>

<style lang="scss" scoped>
  .error-layout {
    :deep(.page-header) {
      margin-top: 64px;
    }

    :deep(.base-footer) {
      @media (width < $breakpoints-m) {
        display: none;
      }
    }
  }
</style>
