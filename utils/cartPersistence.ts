import type { CartItem } from '~/types/cart'
import { readCartStorage, writeCartStorage } from '~/utils/cartStorage'

type CartSnapshot = { version: 1; items: CartItem[] }

export function createCartPersistence() {
  return {
    async restore(): Promise<CartItem[]> {
      const snapshot = readCartStorage() as CartSnapshot | null

      return snapshot?.items ?? []
    },
    async save(items: CartItem[]): Promise<boolean> {
      return writeCartStorage({ version: 1, items })
    },
  }
}
