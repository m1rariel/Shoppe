import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const visible = ref(false)
  const message = ref('')

  const type = ref<'success' | 'error' | 'info'>('info')

  const showNotification = (msgInfo: { message: string; type: 'success' | 'error' | 'info' }) => {
    message.value = msgInfo.message
    type.value = msgInfo.type
    visible.value = true
  }

  const hideNotification = () => {
    visible.value = false
  }

  return {
    visible,
    message,
    type,
    showNotification,
    hideNotification,
  }
})
