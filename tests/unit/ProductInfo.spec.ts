import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import productInfo from '@/components/ProductInfo.vue'
import baseButton from '@/components/BaseButton.vue'
import { product } from '@/tests/fixtures/products'
import type { Product } from '@/types/api'

const { addItem, shareProduct } = vi.hoisted(() => ({
  addItem: vi.fn(),
  shareProduct: vi.fn(),
}))
vi.mock('~/stores/cartStore', () => ({ useCartStore: () => ({ addItem }) }))

const productShareStub = defineComponent({
  props: ['product', 'productUrl'],
  setup(_, { slots }) {
    return () => slots.default?.({ shareProduct })
  },
})
const renderInfo = (selectedProduct: Product = product) =>
  mount(productInfo, {
    props: { product: selectedProduct, productUrl: 'https://shoppe.test/products/1' },
    global: { components: { BaseButton: baseButton, ProductShare: productShareStub } },
  })
const increase = (view: ReturnType<typeof renderInfo>) =>
  view.get('button[aria-label="Increase quantity"]')
const decrease = (view: ReturnType<typeof renderInfo>) =>
  view.get('button[aria-label="Decrease quantity"]')
const cartButton = (view: ReturnType<typeof renderInfo>) => view.get('button[aria-busy]')
const displayedQuantity = (view: ReturnType<typeof renderInfo>) =>
  view.get('.product-info__quantity span').text()

beforeEach(() => {
  addItem.mockReset().mockResolvedValue(true)
  shareProduct.mockReset()
})

describe('ProductInfo', () => {
  it('presents the supplied title, price, description, SKU, category and accessible rating', () => {
    const ratedProduct = { ...product, rating: { rate: 4.5, count: 12 } }
    const view = renderInfo(ratedProduct)

    for (const [selector, expectedText] of [
      ['h1', ratedProduct.title],
      ['.product-info__price', `$ ${ratedProduct.price}`],
      ['.product-info__description', ratedProduct.description],
      ['.product-info__details p:first-child', `SKU:${ratedProduct.id}`],
      ['.product-info__details p:last-child', `Categories:${ratedProduct.category}`],
      ['[role="img"]', '4.5'],
    ] as const) {
      const element = view.get(selector)
      expect(element.isVisible(), selector).toBe(true)
      expect(element.text()).toBe(expectedText)
    }

    expect(
      view.findAll<HTMLElement>('.product-info__star-fill').map((star) => star.element.style.width),
    ).toEqual(['100%', '100%', '100%', '100%', '50%'])
    expect(view.get('[role="img"]').attributes('aria-label')).toBe('4.5 out of 5')
    expect(view.get('button[aria-label="Share product"]').isVisible()).toBe(true)
    expect(decrease(view).text()).toBe('−')
    expect(increase(view).text()).toBe('+')
    expect(cartButton(view).text()).toBe('ADD TO CART')
    expect(cartButton(view).isVisible()).toBe(true)
  })

  it('offers the share action through its accessible button', async () => {
    const view = renderInfo()

    await view.get('button[aria-label="Share product"]').trigger('click')

    expect(shareProduct).toHaveBeenCalledOnce()
  })

  it.each([
    undefined,
    { rate: '4.5' },
    { rate: NaN },
    { rate: -0.1 },
    { rate: 5.1 },
    { rate: 4.5, count: 0 },
    { rate: 4.5, count: 1.5 },
    { rate: 4.5, count: Number.MAX_SAFE_INTEGER + 1 },
    { rate: 4.5, count: undefined },
  ])('shows No ratings for an absent or invalid rating: %j', (rating) => {
    // Malformed API values deliberately cross the typed prop boundary.
    const view = renderInfo({ ...product, rating } as Product)

    expect(view.text()).toContain('No ratings')
    expect(view.find('[role="img"]').exists()).toBe(false)
  })

  it.each([0, 5])('accepts the rating boundary %s', (rate) => {
    const view = renderInfo({ ...product, rating: { rate } })

    expect(view.get('[role="img"]').attributes('aria-label')).toBe(`${rate} out of 5`)
    expect(view.text()).not.toContain('No ratings')
  })

  it('updates the visible details and rating when product props change', async () => {
    const view = renderInfo({ ...product, rating: { rate: 2.25 } })
    const replacement = {
      ...product,
      id: 29,
      title: 'Pearl necklace',
      category: 'Necklaces',
      rating: null,
    }

    await view.setProps({ product: replacement })

    expect(view.get('h1').text()).toBe(replacement.title)
    expect(view.text()).toContain('SKU:29')
    expect(view.text()).toContain(`Categories:${replacement.category}`)
    expect(view.text()).toContain('No ratings')
    expect(view.find('[role="img"]').exists()).toBe(false)
  })

  it('changes the displayed quantity through plus and minus without going below one', async () => {
    const view = renderInfo()

    expect(displayedQuantity(view)).toBe('1')
    expect(decrease(view).attributes('disabled')).toBeDefined()
    await decrease(view).trigger('click')
    expect(displayedQuantity(view)).toBe('1')

    await increase(view).trigger('click')
    await increase(view).trigger('click')
    expect(displayedQuantity(view)).toBe('3')
    await decrease(view).trigger('click')
    expect(displayedQuantity(view)).toBe('2')
    await decrease(view).trigger('click')
    expect(displayedQuantity(view)).toBe('1')
    expect(decrease(view).attributes('disabled')).toBeDefined()
  })

  it('adds the supplied product with the quantity chosen by the user', async () => {
    const view = renderInfo()
    await increase(view).trigger('click')
    await increase(view).trigger('click')

    await cartButton(view).trigger('click')
    await flushPromises()

    expect(addItem).toHaveBeenCalledExactlyOnceWith(product, 3)
  })

  it('blocks duplicate additions and quantity changes while the cart action is pending', async () => {
    let finish!: (result: boolean) => void
    addItem.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve
        }),
    )
    const view = renderInfo()
    await increase(view).trigger('click')
    await cartButton(view).trigger('click')

    expect(cartButton(view).text()).toBe('ADDING…')
    expect(cartButton(view).attributes('aria-busy')).toBe('true')
    for (const button of [cartButton(view), decrease(view), increase(view)]) {
      expect(button.attributes('disabled')).toBeDefined()
      await button.trigger('click')
    }
    expect(displayedQuantity(view)).toBe('2')
    expect(addItem).toHaveBeenCalledExactlyOnceWith(product, 2)

    finish(true)
    await flushPromises()

    expect(cartButton(view).text()).toBe('ADD TO CART')
    expect(cartButton(view).attributes('disabled')).toBeUndefined()
    expect(increase(view).attributes('disabled')).toBeUndefined()
    expect(decrease(view).attributes('disabled')).toBeUndefined()
  })

  it('keeps quantity for updates to the same product and resets it before adding a different product', async () => {
    const view = renderInfo()
    await increase(view).trigger('click')

    await view.setProps({ product: { ...product, title: 'Updated ring' } })
    expect(displayedQuantity(view)).toBe('2')

    const replacement = { ...product, id: product.id + 1, title: 'Pearl necklace' }
    await view.setProps({ product: replacement })
    expect(displayedQuantity(view)).toBe('1')
    expect(decrease(view).attributes('disabled')).toBeDefined()
    await cartButton(view).trigger('click')

    expect(addItem).toHaveBeenCalledExactlyOnceWith(replacement, 1)
  })
})
