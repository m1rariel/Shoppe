import { defineStore } from 'pinia'
import { ref, onScopeDispose } from 'vue'
import { NotificationTypes, type NotificationPayload } from '@/composables/useNotification'

export const useNotificationStore = defineStore('notification', () => {
  const visible = ref(false)
  const message = ref('')
  const type = ref<NotificationTypes>(NotificationTypes.INFO)
  const action = ref<NotificationPayload['action']>()
  const actionText = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer)

    timer = undefined
  }

  const hideNotification = () => {
    clearTimer()
    visible.value = false
    message.value = ''
    type.value = NotificationTypes.INFO
    action.value = undefined
    actionText.value = ''
  }

  const showNotification = (payload: NotificationPayload) => {
    if (!payload.message) return

    clearTimer()
    message.value = payload.message
    type.value = payload.type ?? NotificationTypes.INFO
    action.value = type.value === NotificationTypes.SUCCESS ? payload.action : undefined
    actionText.value = action.value ? (payload.actionText ?? 'View bag') : ''
    visible.value = true
    timer = setTimeout(hideNotification, 5000)
  }

  onScopeDispose(clearTimer)

  return {
    visible,
    message,
    type,
    action,
    actionText,
    showNotification,
    hideNotification,
  }
})
