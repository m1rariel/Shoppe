import { onMounted, ref, watch, type Ref } from 'vue'
import type { ProductReview, ReviewAuthor, ReviewDraft } from '~/types/reviews'
import { parseProductReviews, reviewErrors } from '~/utils/productReviews'

const authorKey = 'shoppe:review-author'

export function useProductReviews(productId: Ref<string>) {
  const reviews = ref<ProductReview[]>([])
  const error = ref('')
  const authorError = ref('')
  const author = ref<ReviewAuthor | null>(null)
  let mounted = false
  const getReviewsStorageKey = () => `shoppe:product-reviews:${productId.value}`

  function load() {
    reviews.value = []
    error.value = ''
    try {
      reviews.value = parseProductReviews(
        localStorage.getItem(getReviewsStorageKey()),
        productId.value,
      )
    } catch {
      error.value = 'Unable to read saved reviews. Please try saving again to retry.'
    }
  }

  function updateAuthor(value: ReviewAuthor | null) {
    authorError.value = ''
    try {
      if (value) localStorage.setItem(authorKey, JSON.stringify(value))
      else localStorage.removeItem(authorKey)
      author.value = value
      return true
    } catch {
      authorError.value = value
        ? 'Unable to remember your name and email. Please try again.'
        : 'Unable to remove remembered name and email. Please try again.'
      return false
    }
  }

  function save(draft: ReviewDraft) {
    if (Object.values(reviewErrors(draft)).some(Boolean)) return false
    error.value = ''
    try {
      const savedReviews = parseProductReviews(
        localStorage.getItem(getReviewsStorageKey()),
        productId.value,
      )
      const review: ProductReview = {
        name: draft.name.trim(),
        email: draft.email.trim(),
        text: draft.text.trim(),
        rating: draft.rating,
        productId: productId.value,
        id:
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      }
      const updatedReviews = [review, ...savedReviews]
      localStorage.setItem(getReviewsStorageKey(), JSON.stringify(updatedReviews))
      reviews.value = updatedReviews
      return true
    } catch {
      error.value = 'Unable to save your review. Your draft is kept. Please try again.'
      return false
    }
  }

  onMounted(() => {
    mounted = true
    load()
    try {
      const savedAuthorJson = localStorage.getItem(authorKey)
      const value: unknown = savedAuthorJson ? JSON.parse(savedAuthorJson) : null
      if (
        value &&
        typeof value === 'object' &&
        'name' in value &&
        'email' in value &&
        typeof value.name === 'string' &&
        typeof value.email === 'string'
      ) {
        author.value = { name: value.name, email: value.email }
      }
    } catch {
      authorError.value = 'Unable to restore remembered name and email.'
    }
  })
  watch(productId, () => {
    if (mounted) load()
  })
  return { reviews, error, authorError, author, save, updateAuthor }
}
