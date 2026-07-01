import { computed } from 'vue'
import type { ComputedRef } from 'vue'

export const useVisiblePages = (
  currentPage: ComputedRef<number>,
  totalPages: ComputedRef<number>,
) => {
  const visiblePages = computed(() => {
    const pagesCount = 3
    const total = totalPages.value
    const current = currentPage.value

    let start = current - 1
    let end = current + 1

    if (start < 1) {
      start = 1
      end = Math.min(pagesCount, total)
    }

    if (end > total) {
      end = total
      start = Math.max(1, total - pagesCount + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  })
  return visiblePages
}
