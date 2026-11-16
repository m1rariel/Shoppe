import type { ProductReview, ReviewDraft } from '~/types/reviews'

export function reviewErrors(draft: ReviewDraft) {
  return {
    name:
      draft.name.trim().length < 1 || draft.name.trim().length > 80
        ? 'Enter a name between 1 and 80 characters.'
        : '',
    email:
      draft.email.trim().length > 254 ||
      !/^[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$/i.test(
        draft.email.trim(),
      )
        ? 'Enter a valid email address (up to 254 characters).'
        : '',
    rating:
      !Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5
        ? 'Choose a rating from 1 to 5.'
        : '',
    text:
      draft.text.trim().length < 10 || draft.text.trim().length > 2000
        ? 'Enter a review between 10 and 2000 characters.'
        : '',
  }
}

export function parseProductReviews(raw: string | null, productId: string): ProductReview[] {
  if (!raw) return []
  const records: unknown = JSON.parse(raw)
  if (!Array.isArray(records)) throw new Error('Invalid reviews')
  return records
    .filter((record): record is ProductReview => {
      if (!record || typeof record !== 'object') return false
      const item = record as ProductReview
      return (
        typeof item.id === 'string' &&
        item.productId === productId &&
        typeof item.name === 'string' &&
        typeof item.email === 'string' &&
        typeof item.text === 'string' &&
        typeof item.createdAt === 'string' &&
        Number.isFinite(Date.parse(item.createdAt)) &&
        !Object.values(reviewErrors(item)).some(Boolean)
      )
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
