<script setup lang="ts">
  import { setResponseStatus, useRequestEvent, useRequestURL, useRoute } from '#app'
  import { computed } from 'vue'
  import { useGetProduct } from '~/composables/api/products/useGetProduct'
  import { useProductReviews } from '~/composables/useProductReviews'
  import { useSimilarProducts } from '~/composables/useSimilarProducts'

  const route = useRoute()
  const event = useRequestEvent()
  const requestOrigin = useRequestURL().origin
  const productId = computed(() => String(route.params.id))
  const { data: product, pending, error, refresh } = await useGetProduct(productId)
  const productUrl = computed(
    () =>
      new URL(
        `/products/${encodeURIComponent(String(product.value?.id ?? productId.value))}`,
        requestOrigin,
      ).href,
  )
  const similar = useSimilarProducts(product)
  const {
    reviews,
    author,
    error: reviewsError,
    authorError,
    save,
    updateAuthor,
  } = useProductReviews(productId)
  const isNotFound = computed(() => error.value?.statusCode === 404)
  const images = computed(() => (product.value?.image ? Array(4).fill(product.value.image) : []))

  if (event && (isNotFound.value || (!pending.value && !error.value && !product.value))) {
    setResponseStatus(event, 404)
  }
</script>

<template>
  <section class="product-page container">
    <div v-if="pending" class="product-page__state" role="status">Loading product…</div>
    <div v-else-if="error && !isNotFound" class="product-page__state" role="alert">
      <h1>Unable to load product</h1>
      <p>Please try again later.</p>
      <BaseButton class="product-page__retry" @click="refresh">Try again</BaseButton>
    </div>

    <div v-else-if="product && !isNotFound" class="product-page__content">
      <ProductGallery :key="product.id" :images="images" :product-title="product.title" />
      <ProductInfo :product="product" :product-url="productUrl" />
      <ProductSections :key="productId" :product-id="productId" :review-count="reviews.length">
        <template #reviews>
          <ProductReviews
            :product-title="product.title"
            :reviews="reviews"
            :author="author"
            :error="reviewsError"
            :author-error="authorError"
            :save="save"
            :update-author="updateAuthor"
          />
        </template>
      </ProductSections>
      <ProductSimilarItems
        :products="similar.products.value"
        :loading="similar.loading.value"
        :error="!!similar.error.value"
        :pending-ids="similar.pendingIds.value"
        @retry="similar.retry()"
        @add-to-cart="similar.addToCart"
      />
    </div>

    <div v-else class="product-page__state" role="status">
      <h1>Product not found</h1>
      <NuxtLink to="/products">Continue shopping</NuxtLink>
    </div>
  </section>
</template>
<style lang="scss" scoped>
  .product-page {
    padding-top: 127px;

    @media (width < $breakpoints-l) {
      padding-top: 48px;
    }

    @media (width < $breakpoints-m) {
      padding-top: 0;
    }
  }

  .product-page__content {
    display: grid;
    grid-template-columns: minmax(0, 700fr) minmax(0, 486fr);
    gap: 62px;
    align-items: start;

    @media (width < $breakpoints-l) {
      gap: 32px;
    }

    @media (width < $breakpoints-m) {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
  }

  .product-page__state {
    min-height: 180px;
    padding: 24px;
    background: $color-light-gray;
    border-radius: 8px;

    h1 {
      margin: 0 0 12px;
      font-size: 20px;
      line-height: 26px;
    }
  }

  .product-page__retry {
    min-height: 44px;
    padding: 8px 16px;
    margin-top: 24px;
    border: 1px solid $color-black;
    border-radius: 4px;
  }
</style>
