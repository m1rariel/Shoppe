import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Product } from '~/types/api'
import type { CartItem } from '~/types/cart'
import { createCartPersistence } from '~/utils/cartPersistence'
import { NotificationTypes, useNotification } from '~/composables/useNotification'
import { useAddNewCart } from '~/composables/api/carts/useAddNewCart'

// The API is educational; account authentication is outside this cart flow.
const DEMO_USER_ID = 1

const validQuantity = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

function productSnapshot(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null
  const product = value as Record<string, unknown>
  if (
    !validQuantity(product.id) ||
    typeof product.price !== 'number' ||
    !Number.isFinite(product.price) ||
    product.price < 0 ||
    typeof product.title !== 'string' ||
    typeof product.category !== 'string' ||
    typeof product.description !== 'string' ||
    (product.image !== undefined && typeof product.image !== 'string')
  )
    return null
  return {
    id: product.id,
    title: product.title,
    price: product.price,
    category: product.category,
    description: product.description,
    ...(product.image === undefined ? {} : { image: product.image }),
  }
}

function restoreItems(entries: unknown[]): CartItem[] {
  const items = new Map<number, CartItem>()
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const { product: unknownProduct, quantity } = entry as Record<string, unknown>
    const product = productSnapshot(unknownProduct)
    if (!product || !validQuantity(quantity)) continue
    const combined = (items.get(product.id)?.quantity ?? 0) + quantity
    if (validQuantity(combined)) items.set(product.id, { product, quantity: combined })
  }
  return [...items.values()]
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const isSidebarOpen = ref(false)
  const pendingMutations = ref(0)
  const isMutating = computed(() => pendingMutations.value > 0)
  const persistence = createCartPersistence()
  const notifications = useNotification()
  const postCart = useAddNewCart()
  let initialization: Promise<void> | undefined
  let queue: Promise<unknown> = Promise.resolve()

  const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value
  }
  const openSidebar = () => {
    isSidebarOpen.value = true
  }
  const closeSidebar = () => {
    isSidebarOpen.value = false
  }
  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  )

  const initialize = () => {
    initialization ??= persistence.restore().then((saved) => {
      items.value = restoreItems(saved)
    })
    return initialization
  }
  const mutate = (
    candidate: () => CartItem[] | null,
    addedProductTitle?: string,
  ): Promise<boolean> => {
    pendingMutations.value++
    const action = queue.then(async () => {
      await initialize()
      try {
        const next = candidate()
        if (!next) return false
        if (!(await persistence.save(next))) throw new Error('Cart could not be saved')
        items.value = next
        try {
          await postCart(DEMO_USER_ID, next)
        } catch {
          notifications.showNotification({
            message:
              'Your bag was saved on this device, but could not be sent to the server. Please try again.',
            type: NotificationTypes.ERROR,
          })
          return true
        }
        if (addedProductTitle !== undefined)
          notifications.showNotification({
            message: `${addedProductTitle} was added to your shopping bag`,
            type: NotificationTypes.SUCCESS,
            action: 'open-cart',
            actionText: 'View bag',
          })
        return true
      } catch {
        await notifications.showNotification({
          message: 'Не удалось сохранить корзину. Попробуйте ещё раз.',
          type: NotificationTypes.ERROR,
        })
        return false
      }
    })
    const settled = action.finally(() => {
      pendingMutations.value--
    })
    queue = settled.catch(() => {})
    return settled
  }
  const addItem = (product: Product, quantity = 1) => {
    const snapshot = productSnapshot(product)
    return mutate(() => {
      if (!snapshot || !validQuantity(quantity)) return null
      const existing = items.value.find((item) => item.product.id === snapshot.id)
      const combined = (existing?.quantity ?? 0) + quantity
      if (!validQuantity(combined)) return null
      return existing
        ? items.value.map((item) =>
            item.product.id === snapshot.id ? { product: snapshot, quantity: combined } : item,
          )
        : [...items.value, { product: snapshot, quantity }]
    }, snapshot?.title)
  }
  const removeItem = (productId: number) =>
    mutate(() => items.value.filter((item) => item.product.id !== productId))
  const updateQuantity = (productId: number, newQuantity: number) =>
    mutate(() => {
      if (newQuantity !== 0 && !validQuantity(newQuantity)) return null
      return newQuantity === 0
        ? items.value.filter((item) => item.product.id !== productId)
        : items.value.map((item) =>
            item.product.id === productId ? { ...item, quantity: newQuantity } : item,
          )
    })
  const adjustQuantity = (productId: number, delta: number) =>
    mutate(() => {
      if (delta !== 1 && delta !== -1) return null
      const current = items.value.find((item) => item.product.id === productId)
      if (!current) return null
      const quantity = current.quantity + delta
      if (quantity !== 0 && !validQuantity(quantity)) return null
      return quantity === 0
        ? items.value.filter((item) => item.product.id !== productId)
        : items.value.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    })
  return {
    items,
    isSidebarOpen,
    isMutating,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    totalItems,
    subtotal,
    initialize,
    addItem,
    removeItem,
    updateQuantity,
    adjustQuantity,
  }
})
