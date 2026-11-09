<script setup lang="ts">
  import { computed, ref, useId, watch } from 'vue'
  import { useIsMobile } from '~/composables/useIsMobile'

  const props = withDefaults(defineProps<{ productId: string | number; reviewCount?: number }>(), {
    reviewCount: 0,
  })
  const isMobile = useIsMobile()
  const idPrefix = `product-sections-${useId()}`
  const selected = ref('description')
  const expanded = ref<string | null>(null)
  const sections = computed(() => [
    { id: 'description', label: 'Description' },
    { id: 'information', label: 'Additional information' },
    { id: 'reviews', label: `Reviews (${props.reviewCount})` },
  ])
  const activeSection = computed({
    get: () => (isMobile.value ? expanded.value : selected.value),
    set: (value: string | null) => {
      if (isMobile.value) expanded.value = value
      else if (value) selected.value = value
    },
  })

  watch(
    () => props.productId,
    () => {
      selected.value = 'description'
      expanded.value = null
    },
  )
</script>

<template>
  <div class="product-sections">
    <BaseTabs
      v-show="!isMobile"
      v-model="selected"
      :sections="sections"
      :id-prefix="idPrefix"
      label="Product information"
    />
    <BaseAccordeon
      :key="productId"
      v-model="activeSection"
      :sections="sections"
      :id-prefix="idPrefix"
      :accordion="isMobile"
    >
      <template #description>
        <slot name="description">
          <p class="product-sections__description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam placerat, augue a
            volutpat hendrerit, sapien tortor faucibus augue, a maximus elit ex vitae libero. Sed
            quis mauris eget arcu facilisis consequat sed eu felis. Nunc sed porta augue. Morbi
            porta tempor odio, in molestie diam bibendum sed.
          </p>
        </slot>
      </template>
      <template #information>
        <slot name="information">
          <dl class="product-sections__information">
            <div>
              <dt>Weight:</dt>
              <dd>0.3 kg</dd>
            </div>
            <div>
              <dt>Dimensions:</dt>
              <dd>15 x 10 x 1 cm</dd>
            </div>
            <div>
              <dt>Colours:</dt>
              <dd>Black, Browns, White</dd>
            </div>
            <div>
              <dt>Material:</dt>
              <dd>Metal</dd>
            </div>
          </dl>
        </slot>
      </template>
      <template #reviews>
        <slot name="reviews">
          <p class="product-sections__empty">There are no reviews yet.</p>
        </slot>
      </template>
    </BaseAccordeon>
  </div>
</template>

<style lang="scss" scoped>
  .product-sections {
    grid-column: 1 / -1;
    margin-top: 37px;
    font-size: 16px;
    line-height: 27px;
    color: $color-dark-gray;

    @media (width < $breakpoints-m) {
      padding: 11px 0 16px;
      margin-top: -8px;
      font-size: 12px;
      line-height: 20px;
      color: $color-black;
      border-top: 1px solid $color-gray;
      border-bottom: 1px solid $color-gray;
    }
  }

  .product-sections__description,
  .product-sections__empty {
    margin: 0;
  }

  .product-sections__information {
    display: grid;
    gap: 10px;
    margin: 0;

    div {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    dt {
      color: $color-black;
    }

    dd {
      margin: 0;
    }
  }
</style>
