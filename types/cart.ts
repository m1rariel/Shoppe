import type { Product } from '~/types/api'

export type CartItem = { product: Product; quantity: number }

export interface CartRequest {
  userId: number
  date: string
  products: { productId: number; quantity: number }[]
}

export interface CartResponse extends CartRequest {
  id: number
}
