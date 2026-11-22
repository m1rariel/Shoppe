import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import productSimilarItems from '@/components/ProductSimilarItems.vue'
import ProductCard from '@/components/ProductCard.vue'
import productCardList from '@/components/ProductCardList.vue'
import baseButton from '@/components/BaseButton.vue'
import { similarProducts } from '@/tests/fixtures/products'

const renderSimilar = (props = {}) =>
  mount(productSimilarItems, {
    props: { products: similarProducts, loading: false, error: false, pendingIds: [], ...props },
    global: { components: { ProductCardList: productCardList, BaseButton: baseButton } },
  })

describe('ProductSimilarItems', () => {
  it('shows Similar Items and matching photos, titles and prices through real product cards', () => {
    const view = renderSimilar()
    const heading = view.get('h2')

    expect(heading.isVisible()).toBe(true)
    expect(heading.text()).toBe('Similar Items')
    expect(view.get('[role="region"][aria-label="Similar products"]').isVisible()).toBe(true)
    const cards = view.findAllComponents(ProductCard)
    expect(cards).toHaveLength(similarProducts.length)
    cards.forEach((card, index) => {
      const product = similarProducts[index]!
      const title = card.get('a')
      const photo = card.get('img')
      const price = card.get('.product-card__price')

      expect(title.isVisible()).toBe(true)
      expect(title.text()).toBe(product.title)
      expect(photo.isVisible()).toBe(true)
      expect(photo.attributes('src')).toBe(product.image)
      expect(price.isVisible()).toBe(true)
      expect(price.text()).toBe(`$ ${product.price}`)
    })
  })

  it('shows loading status before cards and marks the section busy', () => {
    const view = renderSimilar({ loading: true })

    expect(view.get('[role="status"]').text()).toBe('Loading similar items…')
    expect(view.get('section').attributes('aria-busy')).toBe('true')
    expect(view.find('a').exists()).toBe(false)
  })

  it('shows a local error and emits retry when the user clicks Try again', async () => {
    const view = renderSimilar({ error: true })

    expect(view.get('[role="alert"]').text()).toContain('Unable to load similar items.')
    expect(view.get('button').text()).toBe('Try again')
    await view.get('button').trigger('click')

    expect(view.emitted('retry')).toEqual([[]])
    expect(view.find('a').exists()).toBe(false)
  })

  it('hides an empty successful list', () => {
    const view = renderSimilar({ products: [] })

    expect(view.find('section').exists()).toBe(false)
    expect(view.text()).toBe('')
  })

  it('passes add actions from real cards and disables only products currently being added', async () => {
    const view = renderSimilar({ pendingIds: [similarProducts[0]!.id] })
    const buttons = view.findAll('button')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[1]!.attributes('disabled')).toBeUndefined()

    await buttons[0]!.trigger('click')
    expect(view.emitted('addToCart')).toBeUndefined()
    await buttons[1]!.trigger('click')
    expect(view.emitted('addToCart')).toEqual([[similarProducts[1]]])
  })
})
