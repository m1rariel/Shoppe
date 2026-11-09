import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { Product } from '~/types/api'
import { useGetAllProducts } from '~/composables/api/products/useGetAllProducts'
import { useCartStore } from '~/stores/cartStore'

export const useSimilarProducts = (product: MaybeRefOrGetter<Product | null | undefined>) => {
  // Keep the last subscribed key stable during teardown: Nuxt clears the main
  // product after Vue has stopped watchers, but before auxiliary cleanup runs.
  const category = ref(toValue(product)?.category)
  watch(
    () => toValue(product)?.category,
    (value) => {
      category.value = value
    },
    { flush: 'sync' },
  )
  // Do not cap the request before removing the current product.
  const { data, pending, status, error, refresh } = useGetAllProducts({
    category,
    server: false,
    // Isolate auxiliary lifecycle cleanup from the catalog's shared AsyncData key.
    keyPrefix: 'similar-products',
  })
  const products = computed(() => {
    const current = toValue(product)
    if (!current || !category.value) return []
    return (data.value || [])
      .filter((item) => item.category === category.value && item.id !== current.id)
      .slice(0, 3)
  })
  const loading = computed(() => pending.value || status.value === 'idle')
  const cart = useCartStore()
  const pendingIds = ref<number[]>([])
  const addToCart = async (item: Product) => {
    if (pendingIds.value.includes(item.id)) return
    pendingIds.value = [...pendingIds.value, item.id]
    try {
      await cart.addItem(item)
    } finally {
      pendingIds.value = pendingIds.value.filter((id) => id !== item.id)
    }
  }
  return { products, loading, error, retry: refresh, pendingIds, addToCart }
}
