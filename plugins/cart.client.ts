import { defineNuxtPlugin } from '#app'
import { useCartStore } from '~/stores/cartStore'

export default defineNuxtPlugin(() => {
  void useCartStore().initialize()
})
