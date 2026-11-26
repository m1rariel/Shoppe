<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { definePageMeta, navigateTo } from '#imports'
  import { useAuthStore } from '~/stores/auth'
  import { useCartStore } from '~/stores/cartStore'
  import { NotificationTypes, useNotification } from '~/composables/useNotification'
  import type BillingDetailsForm from '~/components/BillingDetailsForm.vue'

  definePageMeta({ middleware: 'checkout' })

  const authStore = useAuthStore()
  const cartStore = useCartStore()
  const { showNotification } = useNotification()
  const billing = ref<InstanceType<typeof BillingDetailsForm> | null>(null)
  const coupon = ref('')
  const paymentMethod = ref('bank')
  const submitting = ref(false)
  const busy = computed(() => submitting.value || cartStore.isMutating)
  let active = true
  let placed = false

  const checkAccess = () => {
    if (!active || placed || import.meta.server) return
    if (!authStore.isAuthenticated) {
      void navigateTo({ path: '/account', query: { returnTo: '/checkout' } })
    } else if (!submitting.value && cartStore.totalItems === 0) {
      void navigateTo('/products')
    }
  }

  watch(() => [authStore.isAuthenticated, cartStore.totalItems], checkAccess, { flush: 'sync' })
  onBeforeUnmount(() => {
    active = false
  })

  const applyCoupon = () => {
    if (busy.value) return
    showNotification({
      message: 'Coupon codes are currently unavailable.',
      type: NotificationTypes.INFO,
    })
  }

  const placeOrder = async () => {
    if (busy.value || !active || placed) return
    submitting.value = true

    try {
      if (!(await billing.value?.validate())) {
        submitting.value = false
        await nextTick()
        if (active) billing.value?.focusInvalid()
        return
      }
      if (!active || !authStore.isAuthenticated || cartStore.totalItems === 0) return

      const cleared = await cartStore.clearCart()
      if (!cleared || !active || !authStore.isAuthenticated) return

      placed = true
      showNotification({
        message: 'Thank you! Your order has been placed.',
        type: NotificationTypes.SUCCESS,
      })
      await navigateTo('/')
    } finally {
      submitting.value = false
      checkAccess()
    }
  }
</script>

<template>
  <ClientOnly>
    <section class="checkout-page container">
      <h1>Checkout</h1>
      <form
        class="checkout-page__form"
        novalidate
        :aria-busy="busy || undefined"
        @submit.prevent="placeOrder"
      >
        <div class="checkout-page__billing">
          <BillingDetailsForm ref="billing" :disabled="busy" />
          <CheckoutCoupon v-model="coupon" :disabled="busy" @apply="applyCoupon" />
        </div>
        <OrderSummary>
          <PaymentMethods v-model="paymentMethod" :disabled="busy" />
          <BaseButton class="checkout-page__submit" button-type="submit" :disabled="busy">
            {{ submitting ? 'PLACING ORDER…' : 'PLACE ORDER' }}
          </BaseButton>
        </OrderSummary>
      </form>
    </section>
  </ClientOnly>
</template>

<style lang="scss" scoped>
  .checkout-page {
    padding-top: 7px;

    @media (min-width: $breakpoints-m) {
      padding-top: 143px;
    }

    h1 {
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: $font-weight-regular;
      line-height: 27px;

      @media (min-width: $breakpoints-m) {
        margin-bottom: 64px;
        font-size: 33px;
        font-weight: $font-weight-medium;
        line-height: 43px;
        text-align: center;
      }
    }
  }

  .checkout-page__form {
    display: grid;
    gap: 72px;

    @media (min-width: $breakpoints-m) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: clamp(32px, 6.12vw, 88px);
    }
  }

  .checkout-page__billing {
    min-width: 0;
  }

  .checkout-page__submit {
    width: 100%;
    min-height: 32px;
    padding: 6px 16px;
    margin-top: 37px;
    font-size: 12px;
    line-height: 20px;
    color: $color-white;
    background: $color-black;
    border-radius: 4px;

    @media (min-width: $breakpoints-m) {
      min-height: 53px;
      padding: 15px 20px;
      margin-top: 45px;
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
