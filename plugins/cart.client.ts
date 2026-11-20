import { defineNuxtPlugin, onNuxtReady } from '#app'
import { useCartStore } from '~/stores/cartStore'

export default defineNuxtPlugin(() => {
  const cartStore = useCartStore()

  onNuxtReady(() => {
    void cartStore.initialize()
  })
})
