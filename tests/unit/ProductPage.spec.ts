import { useRoute } from '#app'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createPinia, disposePinia } from 'pinia'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { h, nextTick, reactive, Suspense } from 'vue'
import { START_LOCATION } from 'vue-router'
import BaseAccordion from '@/components/BaseAccordion.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseNotification from '@/components/BaseNotification.vue'
import BaseTabs from '@/components/BaseTabs.vue'
import ProductCardList from '@/components/ProductCardList.vue'
import ProductGallery from '@/components/ProductGallery.vue'
import ProductImageViewer from '@/components/ProductImageViewer.vue'
import ProductInfo from '@/components/ProductInfo.vue'
import ProductReviews from '@/components/ProductReviews.vue'
import ProductSections from '@/components/ProductSections.vue'
import ProductShare from '@/components/ProductShare.vue'
import ProductSimilarItems from '@/components/ProductSimilarItems.vue'
import ProductPage from '@/pages/products/[id].vue'
import { product, similarProducts } from '@/tests/fixtures/products'
import { server, products } from '@/tests/unit/mocks/product-server'
import { apiBaseURL } from '@/tests/unit/mocks/nuxt-http'

vi.hoisted(async () => {
  const { transferableAbortController } = await import('node:util')
  vi.stubGlobal('AbortController', transferableAbortController().constructor)
})

vi.mock('nuxt/app', () => import('@/tests/unit/mocks/nuxt-http'))
vi.mock('swiper', () => ({
  default: class {
    destroy() {}
  },
}))

describe('product detail page', () => {
  let pinia: ReturnType<typeof createPinia>

  const unhandledRequests: string[] = []
  beforeAll(() => {
    server.listen({
      onUnhandledRequest(request, print) {
        unhandledRequests.push(`${request.method} ${request.url}`)
        print.error()
      },
    })
  })
  afterEach(() => {
    disposePinia(pinia)
    server.resetHandlers()
    server.events.removeAllListeners()
    expect(unhandledRequests.splice(0)).toEqual([])
  })
  afterAll(() => server.close())

  async function openPage(id = String(product.id)) {
    pinia = createPinia()
    const route = reactive({ ...START_LOCATION, params: { id } })
    vi.mocked(useRoute).mockReturnValue(route)

    const page = mount(
      {
        render: () => [h(Suspense, null, { default: () => h(ProductPage) }), h(BaseNotification)],
      },
      {
        attachTo: document.body,
        global: {
          plugins: [pinia],
          components: {
            BaseAccordion,
            BaseButton,
            BaseTabs,
            ProductCardList,
            ProductGallery,
            ProductImageViewer,
            ProductInfo,
            ProductReviews,
            ProductSections,
            ProductShare,
            ProductSimilarItems,
          },
        },
      },
    )
    await flushPromises()
    return { page, route }
  }

  it('shows the selected product with its gallery, tabs and similar items', async () => {
    const categories: (string | null)[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname === '/products') categories.push(url.searchParams.get('category'))
    })
    const { page } = await openPage()
    await vi.waitFor(() =>
      expect(page.get(`a[href="/products/${similarProducts[0].id}"]`).text()).toBe(
        similarProducts[0].title,
      ),
    )
    expect(categories).toContain(product.category)
    expect(page.find(`a[href="/products/${product.id}"]`).exists()).toBe(false)

    const info = page.getComponent(ProductInfo)
    const gallery = page.getComponent(ProductGallery)
    const sections = page.getComponent(ProductSections)
    const similar = page.getComponent(ProductSimilarItems)

    expect(info.isVisible()).toBe(true)
    expect(info.get('h1').text()).toBe(product.title)
    expect(info.get('button[aria-label="Copy product link for Instagram"]').isVisible()).toBe(true)
    expect(gallery.isVisible()).toBe(true)
    expect(gallery.get(`img[alt="${product.title}"]`).attributes('src')).toBe(product.image)
    expect(sections.get('[role="tablist"]').isVisible()).toBe(true)
    expect(similar.get('h2').text()).toBe('Similar Items')
    expect(similar.get('[aria-label="Similar products"]').isVisible()).toBe(true)
  })

  it('opens the real review form inside the Reviews tab', async () => {
    const { page } = await openPage()
    await vi.waitFor(() => expect(page.get('h1').text()).toBe(product.title))
    const reviewsTab = page.findAll('[role="tab"]').find((tab) => tab.text() === 'Reviews (0)')!
    const reviews = page.getComponent(ProductReviews)
    expect(reviews.isVisible()).toBe(false)

    await reviewsTab.trigger('click')

    expect(reviews.isVisible()).toBe(true)
    expect(reviews.get('h2').text()).toBe(`0 Reviews for ${product.title}`)
    expect(reviews.text()).toContain('There are no reviews yet.')
    expect(reviews.get('textarea[name="text"]').isVisible()).toBe(true)
    expect(reviews.get('input[name="name"]').isVisible()).toBe(true)
    expect(reviews.get('input[name="email"]').isVisible()).toBe(true)
    expect(reviews.get('input[type="checkbox"]').isVisible()).toBe(true)
    expect(reviews.findAll('input[type="radio"]')).toHaveLength(5)
    expect(reviews.get('button[type="submit"]').text()).toBe('SUBMIT')
  })

  it('hides the previous product while loading and follows the reactive route ID', async () => {
    let release!: () => void
    let response = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get(`${apiBaseURL}/products/:id`, async ({ params }) => {
        await response
        return HttpResponse.json(products.find((item) => String(item.id) === params.id))
      }),
    )
    const { page, route } = await openPage()
    expect(page.get('[role="status"]').text()).toBe('Loading product…')
    expect(page.find('h1').exists()).toBe(false)

    release()
    await vi.waitFor(() => expect(page.get('h1').text()).toBe(product.title))
    response = new Promise<void>((resolve) => {
      release = resolve
    })
    const nextProduct = similarProducts[0]
    route.params.id = String(nextProduct.id)
    await nextTick()
    expect(page.get('[role="status"]').text()).toBe('Loading product…')
    expect(page.find('h1').exists()).toBe(false)

    release()
    await vi.waitFor(() => expect(page.get('h1').text()).toBe(nextProduct.title))
  })

  it.each(['404', 'empty JSON'])('offers to continue shopping for %s', async (response) => {
    if (response === 'empty JSON') {
      server.use(http.get(`${apiBaseURL}/products/:id`, () => HttpResponse.json(null)))
    }
    const { page } = await openPage('99999')
    await vi.waitFor(() => expect(page.get('h1').text()).toBe('Product not found'))
    expect(page.get('a[href="/products"]').text()).toBe('Continue shopping')
  })

  it('shows a service error and retries the HTTP request', async () => {
    let attempts = 0
    server.use(
      http.get(`${apiBaseURL}/products/:id`, () => {
        attempts++
        return attempts === 1
          ? HttpResponse.json({ message: 'Unavailable' }, { status: 503 })
          : HttpResponse.json(product)
      }),
    )
    const { page } = await openPage()
    await vi.waitFor(() =>
      expect(page.get('[role="alert"]').text()).toContain('Unable to load product'),
    )
    expect(page.get('[role="alert"] p').text()).toBe('Please try again later.')
    expect(page.get('[role="alert"] button').text()).toBe('Try again')
    expect(attempts).toBe(1)
    await page.get('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(page.get('h1').text()).toBe(product.title))
    expect(attempts).toBe(2)
  })

  it('shows a confirmation after adding the product to the cart', async () => {
    const { page } = await openPage()
    await vi.waitFor(() => expect(page.get('h1').text()).toBe(product.title))
    const body = new DOMWrapper(document.body)

    await page.get('button[aria-label="Increase quantity"]').trigger('click')
    const addButton = page.getComponent(ProductInfo).get('button[aria-busy]')
    expect(addButton.text()).toBe('ADD TO CART')
    await addButton.trigger('click')

    await vi.waitFor(() => {
      const notification = body.get('.base-notification[role="status"]')
      expect(notification.isVisible()).toBe(true)
      expect(notification.text()).toContain(`${product.title} was added to your shopping bag`)
    })
  })
})
