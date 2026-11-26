import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cartStore'

export default defineNuxtRouteMiddleware(async () => {
  // The cart lives in localStorage, so access is decided after client-side restoration.
  if (import.meta.server) return

  const cartStore = useCartStore()
  const authStore = useAuthStore()

  await cartStore.initialize()

  if (!cartStore.totalItems) return navigateTo('/products', { replace: true })
  if (!authStore.isAuthenticated) {
    return navigateTo({ path: '/account', query: { returnTo: '/checkout' } }, { replace: true })
  }
})
