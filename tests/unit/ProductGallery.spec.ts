import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import productGallery from '@/components/ProductGallery.vue'
import { product } from '@/tests/fixtures/products'

vi.mock('swiper', () => ({
  default: class {
    slideTo() {}
    destroy() {}
  },
}))
vi.mock('swiper/modules', () => ({ Pagination: {} }))

const { openImage } = vi.hoisted(() => ({ openImage: vi.fn() }))

const imageViewerStub = defineComponent({
  props: ['productTitle'],
  setup(_, { expose }) {
    expose({ open: openImage, close: vi.fn(), closeImage: vi.fn() })
    return () => null
  },
})

const images = ['/images/ring-front.jpg', '/images/ring-side.jpg', '/images/ring-back.jpg']
const renderGallery = (photos = images) =>
  mount(productGallery, {
    props: { images: photos, productTitle: product.title },
    global: { components: { ProductImageViewer: imageViewerStub } },
  })

const mainImage = (view: ReturnType<typeof renderGallery>) =>
  view.get(`button[aria-label="Open enlarged image of ${product.title}"] img`)

// Swiper and the viewer have their own regression tests; these tests exercise gallery props and clicks.
describe('ProductGallery', () => {
  it('shows the first photo and presents each supplied photo with an accessible description', () => {
    const view = renderGallery()

    expect(mainImage(view).isVisible()).toBe(true)
    expect(mainImage(view).attributes('src')).toBe(images[0])
    expect(mainImage(view).attributes('alt')).toBe(product.title)

    images.forEach((source, index) => {
      expect(view.get(`img[alt="${product.title} — ${index + 1}"]`).attributes('src')).toBe(source)
      const thumbnail = view.get(`button[aria-label="View image ${index + 1} of 3"]`)
      expect(thumbnail.isVisible()).toBe(true)
      expect(thumbnail.get('img').attributes('src')).toBe(source)
    })
  })

  it('shows the photo chosen by clicking a thumbnail', async () => {
    const view = renderGallery()
    const thumbnail = view.get('button[aria-label="View image 3 of 3"]')

    await thumbnail.trigger('click')

    expect(mainImage(view).attributes('src')).toBe(images[2])
    expect(thumbnail.attributes('aria-pressed')).toBe('true')
    expect(view.get('button[aria-label="View image 1 of 3"]').attributes('aria-pressed')).toBe(
      'false',
    )
  })

  it.each([`Open enlarged image of ${product.title}`, `Open enlarged image 1 of ${product.title}`])(
    'opens the viewer through %s',
    async (label) => {
      const view = renderGallery()
      const opener = view.get(`button[aria-label="${label}"]`)

      await opener.trigger('click')

      expect(openImage).toHaveBeenCalledExactlyOnceWith(images[0], opener.element)
    },
  )

  it('returns to the first photo when a different set of product photos arrives', async () => {
    const view = renderGallery()
    await view.get('button[aria-label="View image 3 of 3"]').trigger('click')

    await view.setProps({ images: ['/images/necklace-front.jpg', '/images/necklace-back.jpg'] })
    await flushPromises()

    expect(mainImage(view).attributes('src')).toBe('/images/necklace-front.jpg')
    expect(view.get('button[aria-label="View image 1 of 2"]').attributes('aria-pressed')).toBe(
      'true',
    )
  })

  it('shows a single photo without thumbnail selection', () => {
    const view = renderGallery([images[0]!])

    expect(mainImage(view).attributes('src')).toBe(images[0])
    expect(view.find('button[aria-label^="View image"]').exists()).toBe(false)
  })

  it('shows an unavailable message when there are no photos', () => {
    const view = renderGallery([])

    expect(view.text()).toContain('Image unavailable')
    expect(view.find('img').exists()).toBe(false)
    expect(view.find('button[aria-haspopup="dialog"]').exists()).toBe(false)
  })

  it('replaces a failed photo with an unavailable message and removes its opener', async () => {
    const view = renderGallery([images[0]!])

    await mainImage(view).trigger('error')

    expect(view.text()).toContain('Image unavailable')
    expect(view.find('img').exists()).toBe(false)
    expect(view.find('button[aria-haspopup="dialog"]').exists()).toBe(false)
  })
})
