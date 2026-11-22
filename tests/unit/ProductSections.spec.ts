import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import productSections from '@/components/ProductSections.vue'
import baseTabs from '@/components/BaseTabs.vue'
import baseAccordion from '@/components/BaseAccordion.vue'

const resize = async (width: number) => {
  vi.stubGlobal('innerWidth', width)
  window.dispatchEvent(new Event('resize'))
  await nextTick()
}
const renderSections = (slots = {}) =>
  mount(productSections, {
    attachTo: document.body,
    props: { productId: 701, reviewCount: 3 },
    slots,
    global: { components: { BaseTabs: baseTabs, BaseAccordion: baseAccordion } },
  })
const tab = (view: ReturnType<typeof renderSections>, label: string) =>
  view.findAll('[role="tab"]').find((button) => button.text() === label)!
const trigger = (view: ReturnType<typeof renderSections>, label: string) =>
  view.findAll('button[aria-expanded]').find((button) => button.text() === label)!
const controlledPanel = (view: ReturnType<typeof renderSections>, label: string) =>
  view.get(`[id="${tab(view, label).attributes('aria-controls')}"]`)

beforeEach(() => {
  vi.stubGlobal('innerWidth', 1440)
})

describe('ProductSections', () => {
  it('shows all tabs with Description selected initially', () => {
    const view = renderSections()

    const visibleTabs = view.findAll('[role="tab"]').filter((button) => button.isVisible())
    expect(visibleTabs.map((button) => button.text())).toEqual([
      'Description',
      'Additional information',
      'Reviews (3)',
    ])
    expect(controlledPanel(view, 'Description').isVisible()).toBe(true)
    expect(controlledPanel(view, 'Description').text()).toContain('Lorem ipsum dolor sit amet')
    expect(controlledPanel(view, 'Additional information').isVisible()).toBe(false)
    expect(controlledPanel(view, 'Reviews (3)').isVisible()).toBe(false)
  })

  it('shows each additional information label with its value', async () => {
    const view = renderSections()

    await tab(view, 'Additional information').trigger('click')

    const panel = controlledPanel(view, 'Additional information')
    expect(panel.isVisible()).toBe(true)
    expect(panel.findAll('dt').map((label) => label.text())).toEqual([
      'Weight:',
      'Dimensions:',
      'Colours:',
      'Material:',
    ])
    expect(panel.findAll('dd').map((value) => value.text())).toEqual([
      '0.3 kg',
      '15 x 10 x 1 cm',
      'Black, Browns, White',
      'Metal',
    ])
    expect(controlledPanel(view, 'Description').isVisible()).toBe(false)
  })

  it('shows the supplied reviews and hides them when returning to Description', async () => {
    const view = renderSections({ reviews: '<p>Three customers recommend this pendant.</p>' })

    await tab(view, 'Reviews (3)').trigger('click')

    expect(controlledPanel(view, 'Reviews (3)').isVisible()).toBe(true)
    expect(controlledPanel(view, 'Reviews (3)').text()).toBe(
      'Three customers recommend this pendant.',
    )
    expect(controlledPanel(view, 'Description').isVisible()).toBe(false)

    await tab(view, 'Description').trigger('click')

    expect(controlledPanel(view, 'Description').isVisible()).toBe(true)
    expect(controlledPanel(view, 'Reviews (3)').isVisible()).toBe(false)
  })

  it('updates review count and shows the existing empty-review message without a slot', async () => {
    const view = renderSections()
    await view.setProps({ reviewCount: 0 })
    await tab(view, 'Reviews (0)').trigger('click')

    expect(controlledPanel(view, 'Reviews (0)').isVisible()).toBe(true)
    expect(controlledPanel(view, 'Reviews (0)').text()).toBe('There are no reviews yet.')
  })

  it('connects accessible tabs and panels and supports keyboard wrapping, Home and End with focus', async () => {
    const view = renderSections()
    for (const button of view.findAll('[role="tab"]')) {
      expect(
        view.get(`[id="${button.attributes('aria-controls')}"]`).attributes('aria-labelledby'),
      ).toBe(button.attributes('id'))
    }

    for (const [from, key, to] of [
      ['Description', 'ArrowLeft', 'Reviews (3)'],
      ['Reviews (3)', 'ArrowRight', 'Description'],
      ['Description', 'End', 'Reviews (3)'],
      ['Reviews (3)', 'Home', 'Description'],
    ]) {
      await tab(view, from!).trigger('keydown', { key })
      expect(tab(view, to!).attributes('aria-selected')).toBe('true')
      expect(tab(view, to!).attributes('tabindex')).toBe('0')
      expect(document.activeElement).toBe(tab(view, to!).element)
      expect(controlledPanel(view, to!).isVisible()).toBe(true)
    }
  })

  it('starts mobile sections closed and opens one at a time across the 768px boundary', async () => {
    await resize(767)
    const view = renderSections()
    await nextTick()
    expect(view.findAll('[role="region"]').every((panel) => !panel.isVisible())).toBe(true)

    await trigger(view, 'Description').trigger('click')
    expect(view.findAll('[role="region"]').filter((panel) => panel.isVisible())).toHaveLength(1)
    await trigger(view, 'Reviews (3)').trigger('click')
    expect(trigger(view, 'Description').attributes('aria-expanded')).toBe('false')
    expect(trigger(view, 'Reviews (3)').attributes('aria-expanded')).toBe('true')
    expect(controlledPanel(view, 'Reviews (3)').isVisible()).toBe(true)
    await trigger(view, 'Reviews (3)').trigger('click')
    expect(view.findAll('[role="region"]').every((panel) => !panel.isVisible())).toBe(true)

    await resize(768)
    expect(controlledPanel(view, 'Description').attributes('role')).toBe('tabpanel')
    expect(controlledPanel(view, 'Description').isVisible()).toBe(true)
    await resize(767.99)
    expect(view.findAll('[role="region"]').every((panel) => !panel.isVisible())).toBe(true)
  })

  it('closes the expanded mobile section when the product changes', async () => {
    await resize(390)
    const view = renderSections()
    await nextTick()
    const button = trigger(view, 'Additional information')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('tabindex')).toBeUndefined()
    await button.trigger('click')
    expect(controlledPanel(view, 'Additional information').isVisible()).toBe(true)

    await view.setProps({ productId: 702 })
    expect(view.findAll('[role="region"]').every((panel) => !panel.isVisible())).toBe(true)
    await resize(768)
    expect(tab(view, 'Description').attributes('aria-selected')).toBe('true')
  })

  it('preserves an unfinished review through tabs and viewport changes, then clears it for a new product', async () => {
    const reviewDraft = defineComponent({
      setup() {
        const value = ref('')
        return () =>
          h('input', {
            'aria-label': 'Review draft',
            value: value.value,
            onInput: (event: Event) => {
              value.value = (event.target as HTMLInputElement).value
            },
          })
      },
    })
    const view = renderSections({ reviews: () => h(reviewDraft) })
    await tab(view, 'Reviews (3)').trigger('click')
    const original = view.get('input[aria-label="Review draft"]')
    await original.setValue('My unfinished review')
    await tab(view, 'Description').trigger('click')
    await resize(390)
    await trigger(view, 'Reviews (3)').trigger('click')
    await resize(768)
    await tab(view, 'Reviews (3)').trigger('click')
    expect(view.get('input').element).toBe(original.element)
    expect(view.get('input').element.value).toBe('My unfinished review')
    expect(view.get('input').isVisible()).toBe(true)

    await view.setProps({ productId: 702 })
    expect(view.get('input').element.value).toBe('')
    expect(view.get('input').element).not.toBe(original.element)
    expect(controlledPanel(view, 'Description').isVisible()).toBe(true)
    await resize(390)
    expect(view.findAll('[role="region"]').every((panel) => !panel.isVisible())).toBe(true)
  })

  it('gives separate widgets unique accessible control and panel IDs', () => {
    const view = mount(
      defineComponent({
        setup: () => () =>
          h('div', [h(productSections, { productId: 1 }), h(productSections, { productId: 2 })]),
      }),
      {
        global: { components: { BaseTabs: baseTabs, BaseAccordion: baseAccordion } },
      },
    )
    const ids = view.findAll('[id]').map((node) => node.attributes('id'))

    expect(new Set(ids).size).toBe(ids.length)
  })
})
