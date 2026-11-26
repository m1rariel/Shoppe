import type { Product } from '~/types/api'

export const product: Product = {
  id: 701,
  title: 'Moonstone silver pendant',
  price: 48.5,
  image: '/fixtures/moonstone-pendant.jpg',
  category: 'Handmade jewelry',
  description: 'A silver pendant with a pale blue moonstone and an adjustable chain.',
  rating: { rate: 4.7, count: 12 },
}

export const similarProducts: Product[] = [
  {
    id: 702,
    title: 'Amber drop earrings',
    price: 32,
    image: '/fixtures/amber-earrings.jpg',
    category: 'Handmade jewelry',
    description: 'Small amber drops on silver hooks.',
    rating: { rate: 4.3, count: 8 },
  },
  {
    id: 703,
    title: 'Braided copper bracelet',
    price: 27.25,
    image: '/fixtures/copper-bracelet.jpg',
    category: 'Handmade jewelry',
    description: 'An adjustable bracelet made from braided copper.',
    rating: null,
  },
]
