import { useNotificationStore } from '#imports'

export enum NotificationTypes {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export interface NotificationPayload {
  message: string
  type?: NotificationTypes
  action?: 'open-cart'
  actionText?: string
}

export const useNotification = () => {
  const notificationStore = useNotificationStore()
  return {
    showNotification: notificationStore.showNotification,
    hideNotification: notificationStore.hideNotification,
  }
}
