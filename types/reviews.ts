export interface ReviewDraft {
  name: string
  email: string
  rating: number
  text: string
}

export interface ProductReview extends ReviewDraft {
  id: string
  productId: string
  createdAt: string
}

export type ReviewAuthor = Pick<ReviewDraft, 'name' | 'email'>
