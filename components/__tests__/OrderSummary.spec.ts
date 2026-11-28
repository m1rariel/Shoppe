import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OrderSummary from '@/components/OrderSummary.vue'

describe('OrderSummary', () => {
  it('renders supplied lines, totals and payment content, then follows updated props', async () => {
    const summary = mount(OrderSummary, {
      props: {
        orderLines: [
          { productId: 1, title: 'Gold hoop', quantity: 1, total: 25 },
          { productId: 2, title: 'Silver ring', quantity: 3, total: 37.5 },
        ],
        subtotal: 62.5,
        total: 62.5,
      },
      slots: { default: '<button type="submit">PLACE ORDER</button>' },
    })

    expect(
      summary.findAll('tbody tr').map((row) => row.findAll('td').map((cell) => cell.text())),
    ).toEqual([
      ['Gold hoop', '$25'],
      ['Silver ring × 3', '$37.5'],
    ])
    expect(summary.findAll('tfoot td').map((cell) => cell.text())).toEqual([
      '$62.5',
      'Free shipping',
      '$62.5',
    ])
    expect(summary.get('button[type="submit"]').text()).toBe('PLACE ORDER')

    await summary.setProps({
      orderLines: [{ productId: 1, title: 'Updated gold hoop', quantity: 2, total: 50 }],
      subtotal: 50,
      total: 45,
    })

    expect(
      summary.findAll('tbody tr').map((row) => row.findAll('td').map((cell) => cell.text())),
    ).toEqual([['Updated gold hoop × 2', '$50']])
    expect(summary.findAll('tfoot td').map((cell) => cell.text())).toEqual([
      '$50',
      'Free shipping',
      '$45',
    ])
  })
})
