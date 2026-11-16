import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Product } from '~/types/api'
import type { CartItem } from '~/types/cart'
import { createCartPersistence } from '~/utils/cartPersistence'
import { NotificationTypes, useNotification } from '~/composables/useNotification'
import { useAddNewCart } from '~/composables/api/carts/useAddNewCart'

const DEMO_USER_ID = 1

const isValidQuantity = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

function createProductSnapshot(product: Product): Product {
  return {
    id: product.id,
    title: product.title,
    price: product.price,
    category: product.category,
    description: product.description,
    ...(product.image === undefined ? {} : { image: product.image }),
  }
}

function restoreItems(entries: CartItem[]): CartItem[] {
  const itemsByProductId = new Map<number, CartItem>()

  for (const entry of entries) {
    const { product, quantity } = entry
    if (!isValidQuantity(quantity)) continue

    const combinedQuantity = (itemsByProductId.get(product.id)?.quantity ?? 0) + quantity

    if (isValidQuantity(combinedQuantity))
      itemsByProductId.set(product.id, {
        product: createProductSnapshot(product),
        quantity: combinedQuantity,
      })
  }

  return [...itemsByProductId.values()]
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const isSidebarOpen = ref(false)
  const pendingMutationCount = ref(0)
  const isMutating = computed(() => pendingMutationCount.value > 0)
  const persistence = createCartPersistence()
  const notifications = useNotification()
  const postCart = useAddNewCart()
  let initializationPromise: Promise<void> | undefined
  let mutationQueue: Promise<unknown> = Promise.resolve()

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
    initializationPromise ??= persistence.restore().then((savedItems) => {
      items.value = restoreItems(savedItems)
    })

    return initializationPromise
  }

  const mutate = (
    createNextItems: () => CartItem[] | null,
    addedProductTitle?: string,
  ): Promise<boolean> => {
    pendingMutationCount.value++
    const pendingMutation = mutationQueue.then(async () => {
      await initialize()

      try {
        const nextItems = createNextItems()
        if (!nextItems) return false
        if (!(await persistence.save(nextItems))) throw new Error('Cart could not be saved')

        items.value = nextItems

        try {
          await postCart(DEMO_USER_ID, nextItems)
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

    const mutationCompletion = pendingMutation.finally(() => {
      pendingMutationCount.value--
    })
    mutationQueue = mutationCompletion.catch(() => {})

    return mutationCompletion
  }

  const addItem = (product: Product, quantity = 1) => {
    const snapshot = createProductSnapshot(product)

    return mutate(() => {
      if (!isValidQuantity(quantity)) return null

      const existing = items.value.find((item) => item.product.id === snapshot.id)
      const combinedQuantity = (existing?.quantity ?? 0) + quantity

      if (!isValidQuantity(combinedQuantity)) return null

      return existing
        ? items.value.map((item) =>
            item.product.id === snapshot.id
              ? { product: snapshot, quantity: combinedQuantity }
              : item,
          )
        : [...items.value, { product: snapshot, quantity }]
    }, snapshot.title)
  }

  const removeItem = (productId: number) =>
    mutate(() => items.value.filter((item) => item.product.id !== productId))

  const updateQuantity = (productId: number, newQuantity: number) =>
    mutate(() => {
      if (newQuantity !== 0 && !isValidQuantity(newQuantity)) return null

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
      if (quantity !== 0 && !isValidQuantity(quantity)) return null

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
