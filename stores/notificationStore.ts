import { defineStore } from 'pinia'
import { ref, nextTick } from 'vue'
import { NotificationTypes, type NotificationPayload } from '@/composables/useNotification'

export const useNotificationStore = defineStore('notification', () => {
  const visible = ref(false)
  const message = ref('')

  const type = ref<NotificationTypes>(NotificationTypes.INFO)

  const showNotification = async (msgInfo: NotificationPayload) => {
    if (!msgInfo.message) return
    message.value = msgInfo.message
    type.value = msgInfo.type ?? NotificationTypes.INFO
    await nextTick()
    visible.value = true
  }

  const hideNotification = () => {
    visible.value = false
    message.value = ``
    type.value = NotificationTypes.INFO
  }

  return {
    visible,
    message,
    type,
    showNotification,
    hideNotification,
  }
})
