<script setup lang="ts">
  defineProps<{ disabled?: boolean }>()
  defineEmits<{ apply: [] }>()
  const code = defineModel<string>({ default: '' })
</script>

<template>
  <section class="checkout-coupon" aria-label="Coupon code">
    <p>If you have a coupon code, please apply it below.</p>
    <div class="checkout-coupon__controls">
      <BaseInput
        v-model="code"
        name="coupon"
        placeholder="Coupon Code"
        aria-label="Coupon Code"
        :disabled="disabled"
        @keydown.enter.prevent="$emit('apply')"
      />
      <BaseButton class="checkout-coupon__apply" :disabled="disabled" @click="$emit('apply')">
        APPLY COUPON
      </BaseButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
  .checkout-coupon {
    margin-top: 22px;

    @media (min-width: $breakpoints-m) {
      padding: 24px 23px 39px;
      margin-top: 64px;
      border: 1px solid $color-gray;
    }

    p {
      display: none;
      color: $color-dark-gray;

      @media (min-width: $breakpoints-m) {
        display: block;
        margin-bottom: 39px;
        line-height: 24px;
      }
    }
  }

  .checkout-coupon__controls {
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: $breakpoints-m) {
      flex-direction: row;
      gap: 28px;
      align-items: flex-end;
    }

    :deep(.base-input__field) {
      height: 34px;
      padding-bottom: 12px;
      font-size: 12px;
      line-height: 20px;
      border-bottom: 1px solid $color-gray;

      @media (min-width: $breakpoints-m) {
        height: 38px;
        padding-bottom: 16px;
      }

      &::placeholder {
        color: $color-dark-gray;
        opacity: 1;
      }

      &:focus-visible {
        border-color: $color-black;
      }
    }
  }

  .checkout-coupon__apply {
    flex-shrink: 0;
    min-height: 32px;
    padding: 6px 16px;
    font-size: 12px;
    line-height: 20px;
    color: $color-white;
    background: $color-black;
    border-radius: 4px;

    @media (min-width: $breakpoints-m) {
      min-height: 53px;
      padding: 15px 23px;
      font-size: 16px;
      font-weight: $font-weight-bold;
      line-height: 23px;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.7;
    }
  }
</style>
