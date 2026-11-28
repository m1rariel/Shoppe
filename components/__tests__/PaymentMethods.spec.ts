import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PaymentMethods from '~/components/PaymentMethods.vue'

const mountPayment = () =>
  mount(
    defineComponent({
      components: { PaymentMethods },
      setup() {
        const paymentMethod = ref('bank')
        const disabled = ref(false)
        return { paymentMethod, disabled }
      },
      template: `
      <PaymentMethods v-model="paymentMethod" :disabled="disabled" />
      <output>{{ paymentMethod }}</output>
      <button @click="paymentMethod = 'cash'">Pay cash</button>
      <button @click="disabled = !disabled">Toggle availability</button>
    `,
    }),
  )

describe('PaymentMethods', () => {
  it('shows the existing methods in order, with bank transfer selected by default', () => {
    const wrapper = mount(PaymentMethods)
    expect(wrapper.findAll('label span').map((label) => label.text())).toEqual([
      'Direct bank transfer',
      'Check payments',
      'Cash on delivery',
      'PayPal',
    ])
    expect(wrapper.findAll('input').map((input) => input.element.value)).toEqual([
      'bank',
      'check',
      'cash',
      'paypal',
    ])
    expect(wrapper.get('legend').text()).toBe('Payment method')
    expect(wrapper.get<HTMLInputElement>('input[value="bank"]').element.checked).toBe(true)
    expect(wrapper.get('.payment-methods__description').text()).toContain(
      'Please use your Order ID',
    )
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })

  it('updates the parent model for every radio and shows the bank description only for bank', async () => {
    const wrapper = mountPayment()
    for (const value of ['check', 'cash', 'paypal', 'bank']) {
      await wrapper.get(`input[value="${value}"]`).setValue()
      expect(wrapper.get('output').text()).toBe(value)
      expect(wrapper.get<HTMLInputElement>(`input[value="${value}"]`).element.checked).toBe(true)
      expect(wrapper.find('.payment-methods__description').exists()).toBe(value === 'bank')
    }
    await wrapper.get('button').trigger('click')
    expect(wrapper.get<HTMLInputElement>('input[value="cash"]').element.checked).toBe(true)
  })

  it('disables the entire radio group while an operation is busy and re-enables it', async () => {
    const wrapper = mountPayment()
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.get('fieldset').attributes()).toHaveProperty('disabled')
    for (const input of wrapper.findAll('input')) {
      expect(input.element.matches(':disabled')).toBe(true)
    }
    expect(wrapper.get('output').text()).toBe('bank')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.get('input').element.matches(':disabled')).toBe(false)
    await wrapper.get('input[value="paypal"]').setValue()
    expect(wrapper.get('output').text()).toBe('paypal')
  })
})
