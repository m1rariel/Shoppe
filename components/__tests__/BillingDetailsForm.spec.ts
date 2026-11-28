import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BillingDetailsForm from '~/components/BillingDetailsForm.vue'
import BaseInput from '~/components/BaseInput.vue'

interface BillingFormActions {
  validate: () => Promise<boolean>
  focusInvalid: () => void
}

function mountForm() {
  const wrapper = mount(BillingDetailsForm, {
    attachTo: document.body,
    global: { components: { BaseInput } },
  })
  const actions = wrapper.vm as unknown as BillingFormActions
  const input = (name: string) => wrapper.get<HTMLInputElement>(`input[name="${name}"]`)

  return { wrapper, actions, input }
}

describe('BillingDetailsForm', () => {
  it('shows required errors with accessible descriptions and focuses the first remaining invalid field', async () => {
    const { wrapper, actions, input } = mountForm()
    await input('firstName').setValue('   ')
    await input('firstName').trigger('blur')
    expect(await actions.validate()).toBe(false)
    await flushPromises()

    for (const name of ['firstName', 'lastName', 'phone', 'email']) {
      expect(input(name).attributes('aria-invalid')).toBe('true')
      expect(input(name).attributes('aria-describedby')).toBe(`checkout-${name}-error`)
      expect(wrapper.get(`#checkout-${name}-error`).text()).toBe('This field is required.')
    }
    expect(input('notes').attributes('required')).toBeUndefined()
    expect(input('notes').attributes('aria-invalid')).toBeUndefined()
    actions.focusInvalid()
    expect(document.activeElement).toBe(input('firstName').element)

    await input('firstName').setValue(' Ada ')
    await actions.validate()
    await flushPromises()
    actions.focusInvalid()
    expect(document.activeElement).toBe(input('lastName').element)
  })

  it('accepts trimmed names, phone and email with optional notes and preserves field labels and disabled state', async () => {
    const { wrapper, actions, input } = mountForm()
    const values = {
      firstName: ' Ada ',
      lastName: ' Lovelace ',
      phone: ' +1 (234) 567-8901 ',
      email: ' ada@example.com ',
    }
    for (const [name, value] of Object.entries(values)) await input(name).setValue(value)
    expect(await actions.validate()).toBe(true)
    await input('notes').setValue('Leave by the door')
    expect(await actions.validate()).toBe(true)
    expect(input('notes').element.value).toBe('Leave by the door')
    expect(wrapper.findAll('input').map((field) => field.attributes('aria-label'))).toEqual([
      'First name *',
      'Last name *',
      'Phone *',
      'Email *',
      'Order notes',
    ])
    await wrapper.setProps({ disabled: true })
    expect(wrapper.findAll('input').every((field) => field.element.disabled)).toBe(true)
  })

  it.each(['123456', '1234567890123456', '+123abc4567'])(
    'rejects invalid phone %s and retains the email error',
    async (phone) => {
      const { wrapper, actions, input } = mountForm()
      await input('phone').setValue(phone)
      await input('email').setValue('invalid-email')
      await input('email').trigger('blur')
      expect(await actions.validate()).toBe(false)
      await flushPromises()
      expect(wrapper.get('#checkout-phone-error').text()).toBe(
        'Enter a valid phone number (7–15 digits).',
      )
      expect(wrapper.get('#checkout-email-error').text()).toBe('Enter a valid email address.')
    },
  )

  it.each(['1234567', '+123456789012345'])('accepts phone boundary %s', async (phone) => {
    const { actions, input } = mountForm()
    for (const [name, value] of Object.entries({
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone,
      email: 'ada@example.com',
    })) {
      await input(name).setValue(value)
    }
    expect(await actions.validate()).toBe(true)
  })
})
