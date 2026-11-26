import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import productCard from '~/components/ProductCard.vue'
import baseButton from '~/components/BaseButton.vue'
import { product } from '~/tests/fixtures/products'
import { useRouter } from '#app'

const renderCard = (item = product) =>
  mount(productCard, {
    props: { product: item },
    global: { components: { BaseButton: baseButton } },
  })

describe('ProductCard', () => {
  it('shows the supplied photo, full title and price', () => {
    const wrapper = renderCard()
    const photo = wrapper.get('img')
    const title = wrapper.get('h2')
    const price = wrapper.get('.product-card__price')

    expect(photo.isVisible()).toBe(true)
    expect(photo.attributes('src')).toBe(product.image)
    expect(photo.attributes('alt')).toBe(product.title)
    expect(title.isVisible()).toBe(true)
    expect(title.text()).toBe(product.title)
    expect(price.isVisible()).toBe(true)
    expect(price.text()).toBe(`$ ${product.price}`)
    expect(wrapper.get('a').attributes('href')).toBe(`/products/${product.id}`)
    expect(wrapper.get('a').attributes('title')).toBe(product.title)
    expect(wrapper.get('button').isVisible()).toBe(true)
    expect(wrapper.get('button').text()).toBe('ADD TO CART')
  })

  it('shows a readable fallback when the photo is missing', () => {
    const wrapper = renderCard({ ...product, image: undefined })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Image unavailable')
  })

  it('shows a fallback after a failed photo and recovers for another photo', async () => {
    const wrapper = renderCard()
    await wrapper.get('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Image unavailable')

    await wrapper.setProps({ product: { ...product, image: '/fixtures/replacement.jpg' } })
    expect(wrapper.get('img').attributes('src')).toBe('/fixtures/replacement.jpg')
  })

  it('opens the product on the first click', async () => {
    const push = vi.fn()
    vi.mocked(useRouter).mockReturnValueOnce({ ...useRouter(), push })
    const wrapper = renderCard()

    await wrapper.get('section').trigger('click')

    expect(push).toHaveBeenCalledExactlyOnceWith(`/products/${product.id}`)
  })

  it('emits the product when adding to cart without opening the product', async () => {
    const push = vi.fn()
    vi.mocked(useRouter).mockReturnValueOnce({ ...useRouter(), push })
    const wrapper = renderCard()

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('addToCart')).toEqual([[product]])
    expect(push).not.toHaveBeenCalled()
  })

  it('prevents adding to cart while disabled', async () => {
    const wrapper = renderCard()
    await wrapper.setProps({ disabled: true })
    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('addToCart')).toBeUndefined()
  })
})
