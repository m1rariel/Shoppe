import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { Product } from '~/types/api'
import { useGetProducts } from '~/composables/api/products/useGetProducts'
import { useCartStore } from '~/stores/cartStore'

export const useSimilarProducts = (product: MaybeRefOrGetter<Product | null | undefined>) => {
  const category = ref(toValue(product)?.category)
  watch(
    () => toValue(product)?.category,
    (value) => {
      category.value = value
    },
    { flush: 'sync' },
  )
  const {
    data: fetchedProducts,
    pending,
    status,
    error,
    refresh,
  } = useGetProducts({
    category,
    server: false,
    keyPrefix: 'similar-products',
  })
  const products = computed(() => {
    const current = toValue(product)
    if (!current || !category.value) return []
    return (fetchedProducts.value || [])
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
