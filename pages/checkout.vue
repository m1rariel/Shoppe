<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { definePageMeta, navigateTo } from '#imports'
  import { useAuthStore } from '~/stores/auth'
  import { useCartStore } from '~/stores/cartStore'
  import { NotificationTypes, useNotification } from '~/composables/useNotification'
  import { PaymentMethod } from '~/types/checkout'
  import type BillingDetailsForm from '~/components/BillingDetailsForm.vue'

  definePageMeta({ middleware: 'checkout' })

  const authStore = useAuthStore()
  const cartStore = useCartStore()
  const { orderLines, subtotal, total } = storeToRefs(cartStore)
  const { showNotification } = useNotification()

  const billingForm = ref<InstanceType<typeof BillingDetailsForm> | null>(null)
  const coupon = ref('')
  const paymentMethod = ref<PaymentMethod>(PaymentMethod.Bank)
  const submitting = ref(false)
  let isMounted = true
  let orderPlaced = false

  const busy = computed(() => submitting.value || cartStore.isMutating)

  const checkAccess = () => {
    if (!isMounted || orderPlaced || import.meta.server) return
    if (!authStore.isAuthenticated) {
      void navigateTo({ path: '/account', query: { returnTo: '/checkout' } })
    } else if (!submitting.value && cartStore.totalItems === 0) {
      void navigateTo('/products')
    }
  }

  const applyCoupon = () => {
    if (busy.value) return
    showNotification({
      message: 'Coupon codes are currently unavailable.',
      type: NotificationTypes.INFO,
    })
  }

  const placeOrder = async () => {
    if (busy.value || !isMounted || orderPlaced) return
    submitting.value = true

    try {
      const formValid = await billingForm.value?.validate()
      if (!formValid) {
        submitting.value = false
        await nextTick()

        if (isMounted) billingForm.value?.focusInvalid()
        return
      }

      if (!isMounted || !authStore.isAuthenticated || cartStore.totalItems === 0) return

      const cleared = await cartStore.clearCart()
      if (!cleared || !isMounted || !authStore.isAuthenticated) return

      orderPlaced = true
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

  watch(() => [authStore.isAuthenticated, cartStore.totalItems], checkAccess, { flush: 'sync' })
  onBeforeUnmount(() => {
    isMounted = false
  })
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
          <BillingDetailsForm ref="billingForm" :disabled="busy" />
          <CheckoutCoupon v-model="coupon" :disabled="busy" @apply="applyCoupon" />
        </div>
        <OrderSummary :order-lines="orderLines" :subtotal="subtotal" :total="total">
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
