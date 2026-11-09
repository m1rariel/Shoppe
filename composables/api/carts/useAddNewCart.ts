import { useCookie, useRuntimeConfig } from 'nuxt/app'
import { $fetch } from 'ofetch'
import type { CartItem, CartRequest, CartResponse } from '~/types/cart'
import { createApiHeaders, resolveApiBaseURL } from '~/utils/apiConnection'

export const useAddNewCart = () => {
  const config = useRuntimeConfig()
  const authToken = useCookie('authToken')
  const baseURL = resolveApiBaseURL(config.public.apiBaseUrl)

  return (userId: number, items: readonly CartItem[]) => {
    const body: CartRequest = {
      userId,
      date: new Date().toISOString().slice(0, 10),
      products: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
    }

    return $fetch<CartResponse>('/carts', {
      method: 'POST',
      baseURL,
      headers: createApiHeaders(authToken.value),
      body,
      retry: 0,
      timeout: 10000,
    })
  }
}
