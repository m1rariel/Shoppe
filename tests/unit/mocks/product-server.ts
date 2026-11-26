import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { product, similarProducts } from '@/tests/fixtures/products'
import { apiBaseURL } from '@/tests/unit/mocks/nuxt-http'

export const products = [product, ...similarProducts]
export const server = setupServer(
  http.get(`${apiBaseURL}/products/:id`, ({ params }) => {
    const selected = products.find((item) => String(item.id) === params.id)
    return selected
      ? HttpResponse.json(selected)
      : HttpResponse.json({ message: 'Product not found' }, { status: 404 })
  }),
  http.get(`${apiBaseURL}/products`, ({ request }) => {
    const category = new URL(request.url).searchParams.get('category')

    if (category && category !== product.category) {
      return HttpResponse.json({ message: 'Unexpected category' }, { status: 400 })
    }
    return HttpResponse.json(products)
  }),
  http.post(`${apiBaseURL}/carts`, async ({ request }) =>
    HttpResponse.json({ id: 1, ...((await request.json()) as object) }, { status: 201 }),
  ),
)
