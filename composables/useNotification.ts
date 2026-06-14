import { useNotificationStore } from '#imports'

export enum NotificationTypes {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export interface NotificationPayload {
  message: string
  type?: NotificationTypes
}

export const useNotification = () => {
  const notificationStore = useNotificationStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  const showNotification = ({ message, type = NotificationTypes.INFO }: NotificationPayload) => {
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
