import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BasePagination from '~/components/BasePagination.vue'
import BaseButton from '~/components/BaseButton.vue'

const renderPagination = (currentPage: number, totalPages: number, visiblePages: number[]) =>
  mount(BasePagination, {
    props: { currentPage, totalPages, visiblePages },
    global: { components: { BaseButton } },
  })

describe('BasePagination', () => {
  it.each([0, 1])('hides navigation for %i pages', (totalPages) => {
    const wrapper = renderPagination(1, totalPages, totalPages ? [1] : [])

    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('announces the current page, ignores its click and emits the next page once', async () => {
    const wrapper = renderPagination(1, 4, [1, 2, 3])
    const current = wrapper.get('button[aria-current="page"]')

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Product pages')
    expect(current.attributes('aria-label')).toBe('Page 1')
    expect(current.attributes('type')).toBe('button')
    expect(wrapper.findAll('button[aria-label^="Page "]').map((button) => button.text())).toEqual([
      '1',
      '2',
      '3',
    ])

    await current.trigger('click')
    expect(wrapper.emitted('changePage')).toBeUndefined()

    await wrapper.get('button[aria-label="Next page"]').trigger('click')
    expect(wrapper.emitted('changePage')).toEqual([[2]])
  })

  it('hides next on the last page and permits returning to earlier pages', async () => {
    const wrapper = renderPagination(4, 4, [2, 3, 4])

    expect(wrapper.find('button[aria-label="Next page"]').exists()).toBe(false)
    expect(wrapper.get('button[aria-current="page"]').text()).toBe('4')

    await wrapper.get('button[aria-label="Page 2"]').trigger('click')
    expect(wrapper.emitted('changePage')).toEqual([[2]])
  })
})
