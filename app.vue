<script setup>
  import { onMounted } from 'vue'
  import BaseNotification from './components/BaseNotification.vue'
  import { useNotificationStore } from './stores/notificationStore'
  import { useCartStore } from './stores/cartStore'
  import CartSidebar from './components/CartSidebar.vue'

  const notificationStore = useNotificationStore()
  const cartStore = useCartStore()

  onMounted(() => {
    cartStore.loadCart()
  })
</script>

<template>
  <div class="app">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <BaseNotification v-if="notificationStore.visible && notificationStore.message" />
    <CartSidebar />
  </div>
</template>
