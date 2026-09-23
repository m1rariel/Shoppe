import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Product } from '~/types/api'

type CartItem = {
  product: Product
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const isSidebarOpen = ref(false)

  const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value
  }
  const openSidebar = () => {
    isSidebarOpen.value = true
  }
  const closeSidebar = () => {
    isSidebarOpen.value = false
  }

  const totalItems = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  const addItem = (product: Product, quantity = 1) => {
    const hasItem = items.value.find((item) => item.product.id === product.id)

    if (hasItem) {
      hasItem.quantity += quantity
      openSidebar()
      saveCart()
      return
    }

    items.value.push({ product, quantity })
    openSidebar()
    saveCart()
  }

  const removeItem = (productId: number) => {
    items.value = items.value.filter((item) => item.product.id !== productId)
    saveCart()
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId)
      return
    }
    const item = items.value.find((item) => item.product.id === productId)

    if (item) {
      item.quantity = newQuantity
      saveCart()
    }
  }

  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  })

  const saveCart = () => {
    localStorage.setItem('cart', JSON.stringify(items.value))
  }

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart')

    if (!savedCart) {
      return
    }
    items.value = JSON.parse(savedCart)
  }
  return {
    items,
    isSidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    totalItems,
    addItem,
    removeItem,
    updateQuantity,
    subtotal,
    saveCart,
    loadCart,
  }
})
