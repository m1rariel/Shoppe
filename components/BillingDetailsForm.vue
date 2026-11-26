<script setup lang="ts">
  import { useField, useForm } from 'vee-validate'
  import { email, regex, required } from '@vee-validate/rules'
  import type BaseInput from '~/components/BaseInput.vue'

  defineProps<{ disabled?: boolean }>()

  const { validate } = useForm()
  const phonePattern = /^\+?(?=(?:\D*\d){7,15}\D*$)[\d ()-]+$/
  const requiredName = (value: string) => required(value?.trim()) || 'This field is required.'
  const emailRule = (value: string) =>
    requiredName(value) === true
      ? email(value.trim()) || 'Enter a valid email address.'
      : 'This field is required.'
  const phoneRule = (value: string) =>
    requiredName(value) === true
      ? regex(value.trim(), [phonePattern]) || 'Enter a valid phone number (7–15 digits).'
      : 'This field is required.'

  const firstName = useField<string>('firstName', requiredName, { initialValue: '' })
  const lastName = useField<string>('lastName', requiredName, { initialValue: '' })
  const phone = useField<string>('phone', phoneRule, { initialValue: '' })
  const emailAddress = useField<string>('email', emailRule, { initialValue: '' })
  const notes = useField<string>('notes', undefined, { initialValue: '' })
  const fields = [
    {
      name: 'firstName',
      label: 'First name *',
      autocomplete: 'given-name',
      type: 'text',
      field: firstName,
    },
    {
      name: 'lastName',
      label: 'Last name *',
      autocomplete: 'family-name',
      type: 'text',
      field: lastName,
    },
    { name: 'phone', label: 'Phone *', autocomplete: 'tel', type: 'tel', field: phone },
    { name: 'email', label: 'Email *', autocomplete: 'email', type: 'email', field: emailAddress },
    { name: 'notes', label: 'Order notes', autocomplete: 'off', type: 'text', field: notes },
  ]
  type InputInstance = InstanceType<typeof BaseInput>
  const inputs: Record<string, InputInstance | null> = {}

  defineExpose({
    validate: async () => (await validate()).valid,
    focusInvalid: () => {
      const firstInvalid = fields.find(({ field }) => field.errorMessage.value)
      if (firstInvalid) inputs[firstInvalid.name]?.focus()
    },
  })
</script>

<template>
  <section class="billing-details" aria-labelledby="billing-title">
    <h2 id="billing-title">Billing Details</h2>
    <div class="billing-details__fields">
      <BaseInput
        v-for="item in fields"
        :id="`checkout-${item.name}`"
        :key="item.name"
        :ref="(input) => (inputs[item.name] = input as InputInstance | null)"
        v-model="item.field.value.value"
        class="billing-details__field"
        :class="{
          'billing-details__field--name': item.name === 'firstName' || item.name === 'lastName',
          'billing-details__field--notes': item.name === 'notes',
        }"
        :name="item.name"
        :type="item.type"
        :autocomplete="item.autocomplete"
        :placeholder="item.label"
        :aria-label="item.label"
        :required="item.name !== 'notes'"
        :disabled="disabled"
        :error="Boolean(item.field.errorMessage.value)"
        :error-message="item.field.errorMessage.value"
        :error-id="`checkout-${item.name}-error`"
        :aria-describedby="
          item.field.errorMessage.value ? `checkout-${item.name}-error` : undefined
        "
        @blur="item.field.handleBlur"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
  .billing-details {
    h2 {
      margin: 0 0 22px;
      font-size: 16px;
      font-weight: $font-weight-regular;
      line-height: 27px;

      @media (min-width: $breakpoints-m) {
        margin-bottom: 27px;
        font-size: 26px;
        line-height: 35px;
      }
    }
  }

  .billing-details__fields {
    display: grid;
    gap: 22px;

    @media (min-width: $breakpoints-m) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 27px 40px;
    }
  }

  .billing-details__field {
    min-width: 0;

    @media (min-width: $breakpoints-m) {
      grid-column: 1 / -1;

      &--name {
        grid-column: auto;
      }
    }

    :deep(.base-input__field) {
      height: 25px;
      padding-bottom: 6px;
      font-size: 12px;
      line-height: 18px;
      border-bottom: 1px solid $color-gray;

      @media (min-width: $breakpoints-m) {
        height: 39px;
        padding-bottom: 13px;
        font-size: 16px;
        line-height: 28px;
      }

      &::placeholder {
        color: $color-dark-gray;
        opacity: 1;
      }

      &[aria-invalid='true'] {
        border-color: $color-errors;
      }

      &:focus-visible {
        outline: 1px solid $color-black;
        outline-offset: 3px;
      }
    }

    &--notes :deep(.base-input__field) {
      height: 33px;
      padding-bottom: 14px;

      @media (min-width: $breakpoints-m) {
        height: 39px;
        padding-bottom: 13px;
      }
    }

    :deep(.base-input__error) {
      margin-top: 4px;
      font-size: 12px;
      line-height: 18px;
      color: $color-errors;
    }
  }
</style>
