<script setup lang="ts">
  import type { CartOrderLine } from '~/types/cart'

  defineProps<{
    orderLines: CartOrderLine[]
    subtotal: number
    total: number
  }>()

  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
</script>

<template>
  <section class="order-summary" aria-labelledby="order-title">
    <h2 id="order-title">Your Order</h2>
    <div class="order-summary__panel">
      <table class="order-summary__table">
        <thead>
          <tr>
            <th scope="col">PRODUCT</th>
            <th scope="col">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in orderLines" :key="line.productId" class="order-summary__product">
            <td>
              {{ line.title }}<span v-if="line.quantity > 1"> × {{ line.quantity }}</span>
            </td>
            <td>{{ currency.format(line.total) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">SUBTOTAL</th>
            <td>{{ currency.format(subtotal) }}</td>
          </tr>
          <tr>
            <th scope="row">SHIPPING</th>
            <td>Free shipping</td>
          </tr>
          <tr class="order-summary__total">
            <th scope="row">TOTAL</th>
            <td>{{ currency.format(total) }}</td>
          </tr>
        </tfoot>
      </table>
      <slot></slot>
    </div>
  </section>
</template>

<style lang="scss" scoped>
  .order-summary {
    min-width: 0;

    h2 {
      margin: 0 0 28px;
      font-size: 16px;
      font-weight: $font-weight-regular;
      line-height: 27px;

      @media (min-width: $breakpoints-m) {
        margin-bottom: 39px;
        font-size: 26px;
        line-height: 25px;
      }
    }
  }

  .order-summary__panel {
    padding: 20px 16px 24px;
    background: $color-light-gray;
    border-radius: 4px;

    @media (min-width: $breakpoints-m) {
      padding: 39px 59px 48px;
      border-radius: 0;
    }
  }

  .order-summary__table {
    width: 100%;
    font-size: 12px;
    line-height: 20px;
    table-layout: fixed;
    border-spacing: 0;
    border-collapse: collapse;

    @media (min-width: $breakpoints-m) {
      font-size: 16px;
      line-height: 27px;
    }

    :where(th) {
      font-weight: $font-weight-regular;
      text-align: left;
    }

    :where(td, th) {
      padding: 0;
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    :where(td) {
      color: $color-dark-gray;
    }

    :where(thead th) {
      padding-bottom: 16px;
      border-bottom: 1px solid $color-gray;

      @media (min-width: $breakpoints-m) {
        padding-bottom: 17px;
      }
    }

    :where(tfoot th, tfoot td) {
      padding-top: 22px;
      padding-bottom: 21px;
      border-top: 1px solid $color-gray;

      @media (min-width: $breakpoints-m) {
        padding-top: 14px;
        padding-bottom: 11px;
      }
    }
  }

  .order-summary__product :where(td) {
    padding-top: 22px;
    padding-bottom: 22px;

    @media (min-width: $breakpoints-m) {
      padding-top: 18px;
      padding-bottom: 8px;
    }
  }

  .order-summary__product:first-child :where(td) {
    @media (min-width: $breakpoints-m) {
      padding-top: 21px;
    }
  }

  .order-summary__product:last-child :where(td) {
    @media (min-width: $breakpoints-m) {
      padding-bottom: 12px;
    }
  }

  .order-summary__total {
    border-bottom: 1px solid $color-gray;

    @media (min-width: $breakpoints-m) {
      border-bottom: 0;
    }

    :where(th, td) {
      padding-bottom: 20px;
      color: $color-black;

      @media (min-width: $breakpoints-m) {
        padding-top: 20px;
        padding-bottom: 0;
        font-weight: $font-weight-bold;
      }
    }
  }

  .order-summary__table td:last-child,
  .order-summary__table th:last-child {
    width: 40%;
    padding-left: 8px;
    text-align: right;
  }
</style>
