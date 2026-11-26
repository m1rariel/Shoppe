<script setup lang="ts">
  import PaypalIcon from '~/assets/icons/paypal-icon.svg'

  defineProps<{ disabled?: boolean }>()
  const method = defineModel<string>({ default: 'bank' })
  const methods = [
    { value: 'bank', label: 'Direct bank transfer' },
    { value: 'check', label: 'Check payments' },
    { value: 'cash', label: 'Cash on delivery' },
    { value: 'paypal', label: 'PayPal' },
  ]
</script>

<template>
  <fieldset class="payment-methods" :disabled="disabled">
    <legend class="payment-methods__legend">Payment method</legend>
    <div
      v-for="option in methods"
      :key="option.value"
      class="payment-methods__option"
      :class="{ 'payment-methods__option--expanded': option.value === 'bank' && method === 'bank' }"
    >
      <label>
        <input v-model="method" type="radio" name="payment" :value="option.value" />
        <span>{{ option.label }}</span>
        <PaypalIcon v-if="option.value === 'paypal'" width="13" height="16" aria-hidden="true" />
      </label>
      <p v-if="option.value === 'bank' && method === 'bank'" class="payment-methods__description">
        Make your payment directly into our bank account. Please use your Order ID as the payment
        reference. Your order will not be shipped until the funds have cleared in our account
      </p>
    </div>
  </fieldset>
</template>

<style lang="scss" scoped>
  .payment-methods {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
    padding: 0;
    margin: 41px 0 0;
    border: 0;

    @media (min-width: $breakpoints-m) {
      gap: 18px;
      margin-top: 59px;
    }
  }

  .payment-methods__legend {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    white-space: nowrap;
    clip-path: inset(50%);
  }

  .payment-methods__option {
    &--expanded {
      margin-bottom: -18px;

      @media (min-width: $breakpoints-m) {
        margin-bottom: -4px;
      }
    }

    label {
      display: flex;
      gap: 10px;
      align-items: center;
      width: fit-content;
      font-size: 12px;
      line-height: 20px;
      cursor: pointer;

      @media (min-width: $breakpoints-m) {
        gap: 8px;
        font-size: 16px;
        line-height: 27px;
      }
    }

    input {
      display: grid;
      flex-shrink: 0;
      place-content: center;
      width: 16px;
      height: 16px;
      margin: 0;
      appearance: none;
      cursor: pointer;
      border: 1.5px solid $color-black;
      border-radius: 50%;

      &::before {
        width: 6px;
        height: 6px;
        content: '';
        background: $color-black;
        border-radius: 50%;
        transform: scale(0);
      }

      &:checked::before {
        transform: scale(1);
      }

      &:focus-visible {
        outline: 2px solid $color-black;
        outline-offset: 3px;
      }
    }
  }

  .payment-methods__description {
    margin-top: 14px;
    font-size: 12px;
    line-height: 20px;
    color: $color-dark-gray;

    @media (min-width: $breakpoints-m) {
      margin-top: 19px;
    }
  }
</style>
