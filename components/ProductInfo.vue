<script setup lang="ts">
  import type { Product } from '~/types/api'
  import { ref } from 'vue'
  import FCIcon from '~/assets/icons/fc-icon.svg'
  import InstIcon from '~/assets/icons/inst-icon.svg'
  import TWIcon from '~/assets/icons/twitter-icon.svg'
  import MailIcon from '~/assets/icons/mail-icon.svg'
  import ShareIcon from '~/assets/icons/share-icon.svg'
  import StarIcon from '~/assets/icons/star-icon.svg'
  import { useNotification, NotificationTypes } from '~/composables/useNotification'
  import { useCartStore } from '~/stores/cartStore'

  const cartStore = useCartStore()

  const { showNotification } = useNotification()

  const shareProduct = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: props.product.title, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        showNotification({ message: 'Ссылка скопирована', type: NotificationTypes.SUCCESS })
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      showNotification({ message: 'Не удалось поделиться ссылкой', type: NotificationTypes.ERROR })
    }
  }

  const quantity = ref(1)

  const props = defineProps<{
    product: Product
  }>()

  const disabledQuantity = () => {
    if (quantity.value > 1) {
      quantity.value--
    }
  }

  const handleAddToCart = () => {
    cartStore.addItem(props.product, quantity.value)
  }

  const reviewsCount = 1
</script>

<template>
  <div class="product-info">
    <h1 class="product-info__title">{{ product.title }}</h1>
    <div class="product-info__price-row">
      <p class="product-info__price">$ {{ product.price }}</p>
      <BaseButton class="product-info__share" @click="shareProduct">
        <ShareIcon aria-hidden="true" />
      </BaseButton>
    </div>

    <div class="product-info__rating">
      <div class="product-info__stars">
        <span v-for="star in 5" :key="star" class="product-info__star">
          <StarIcon />
        </span>
      </div>

      <span class="product-info__reviews"> {{ reviewsCount }} customer review </span>
    </div>
    <p class="product-info__description">
      {{ product.description }}
    </p>

    <div class="product-info__actions">
      <div class="product-info__quantity">
        <button type="button" :disabled="quantity <= 1" @click="disabledQuantity">−</button>

        <span>{{ quantity }}</span>

        <button type="button" @click="quantity++">+</button>
      </div>

      <BaseButton class="product-info__add-to-cart" @click="handleAddToCart">
        ADD TO CART
      </BaseButton>
    </div>

    <div class="product-info__soc1als" aria-label="Социальные сети">
      <a><MailIcon aria-hidden="true" /></a>
      <a href="https://www.facebook.com/" target="_blank" aria-label="Facebook"
        ><FCIcon aria-hidden="true"
      /></a>
      <a href="https://www.instagram.com/" target="_blank" aria-label="Instagram"
        ><InstIcon aria-hidden="true"
      /></a>
      <a href="https://twitter.com/" target="_blank" aria-label="Twitter"
        ><TWIcon aria-hidden="true"
      /></a>
    </div>

    <div class="product-info__details">
      <p>
        <span class="product-info__label">SKU:</span>
        <span>{{ product.id }}</span>
      </p>
      <p>
        <span class="product-info__label">Categories:</span>
        <span>{{ product.category }}</span>
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .product-info__rating {
    display: flex;
    gap: 24px;
    align-items: center;
    margin-top: 70px;
  }

  .product-info__stars {
    display: flex;
    flex-shrink: 0;
    gap: 10px;
    align-items: center;
  }

  .product-info__star {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
  }

  .product-info__star svg {
    display: block;
  }

  .product-info__reviews {
    font-family: $font-main;
    font-size: 16px;
    font-weight: 400;
    line-height: 27px;
    color: $color-dark-gray;
  }

  .product-info {
    min-width: 0;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
  }

  .product-info__title {
    font-size: 26px;
    font-weight: $font-weight-regular;
    line-height: 35px;
  }

  .product-info__price-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
  }

  .product-info__share {
    display: none;
    width: 44px;
    height: 44px;
    color: $color-black;
  }

  .product-info__soc1als {
    display: flex;
    gap: 24px;
    align-items: center;
    margin-top: 80px;
    color: $color-dark-gray;
  }

  .product-info__soc1als a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 24px;
  }

  .product-info__soc1als svg {
    max-width: 20px;
    height: 20px;
  }

  .product-info__price {
    font-size: 20px;
    font-weight: $font-weight-medium;
    line-height: 26px;
    color: $color-accent;
  }

  .product-info__description {
    margin-top: 24px;
    color: $color-dark-gray;
  }

  .product-info__actions {
    display: flex;
    gap: 24px;
    margin-top: 48px;
  }

  .product-info__quantity {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    min-width: 102px;
    height: 54px;
    color: $color-dark-gray;
    background-color: $color-light-gray;
    border-radius: 4px;
  }

  .product-info__quantity span {
    min-width: 30px;
    text-align: center;
  }

  .product-info__quantity button {
    width: 36px;
    height: 100%;
    color: inherit;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .product-info__add-to-cart {
    flex: 1;
    min-width: 0;
    min-height: 54px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 16px;
    font-weight: $font-weight-bold;
    line-height: 22px;
    color: $color-black;
    background-color: transparent;
    border: 1px solid $color-black;
    border-radius: 4px;
    transition:
      color 0.2s ease,
      background-color 0.2s ease;
  }

  .product-info__details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 40px;
  }

  .product-info__details p {
    display: flex;
    gap: 16px;
    color: $color-dark-gray;
  }

  .product-info__label {
    flex-shrink: 0;
    color: $color-black;
  }

  @media (max-width: $breakpoints-m) {
    .product-info__rating {
      display: none;
    }

    .product-info {
      display: flex;
      flex-direction: column;
    }

    .product-info__title {
      font-size: 20px;
      line-height: 26px;
    }

    .product-info__price-row {
      margin-top: 4px;
    }

    .product-info__share {
      display: inline-flex;
      margin-right: -10px;
    }

    .product-info__soc1als {
      display: none;
    }

    .product-info__price {
      font-size: 16px;
      line-height: 26px;
    }

    .product-info__actions {
      order: 1;
      margin-top: 32px;
    }

    .product-info__quantity {
      display: none;
    }

    .product-info__add-to-cart {
      min-height: 40px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: $font-weight-regular;
      line-height: 20px;
    }

    .product-info__description {
      order: 2;
      margin-top: 16px;
      font-size: 14px;
      line-height: 24px;
    }

    .product-info__details {
      display: none;
    }
  }
</style>
