import { useNotificationStore } from '#imports'

export const useNotification = () => {
  const notificationStore = useNotificationStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    notificationStore.showNotification({ message, type })

    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      notificationStore.hideNotification()
    }, 5000)
  }

  const hideNotification = () => {
    if (timer) {
      clearTimeout(timer)
    }
    notificationStore.hideNotification()
  }

  return {
    showNotification,
    hideNotification,
  }
}
