<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import Swiper from 'swiper'
  import { Pagination } from 'swiper/modules'
  import 'swiper/css'
  import 'swiper/css/pagination'

  const props = defineProps<{
    images: string[]
  }>()

  const activeIndex = ref(0)
  const swiper = ref<Swiper | null>(null)

  onMounted(() => {
    swiper.value = new Swiper('.product-gallery__slider', {
      modules: [Pagination],
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      lazyPreloadPrevNext: 1,
      pagination: {
        el: '.product-gallery__slider .swiper-pagination',
        clickable: true,
      },
    })
  })
</script>
<template>
  <div class="product-gallery">
    <div class="product-gallery__desktop">
      <div class="product-gallery__miniatures">
        <button
          v-for="(image, index) in props.images"
          :key="index"
          type="button"
          class="product-gallery__miniature"
          :class="{ 'product-gallery__miniature--active': activeIndex === index }"
          @click="activeIndex = index"
        >
          <img :src="image" :alt="`Фото`" />
        </button>
      </div>
      <Transition name="product-image" mode="out-in">
        <img
          v-if="props.images.length"
          :key="activeIndex"
          :src="props.images[activeIndex]"
          alt="Фото товара"
          class="product-gallery__active-image"
        />
      </Transition>

      <div v-if="props.images.length" class="product-gallery__progress">
        <div
          class="product-gallery__progress-active"
          :style="{
            width: `${100 / props.images.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }"
        ></div>
      </div>
    </div>
    <div class="swiper product-gallery__slider">
      <div class="swiper-wrapper">
        <div v-for="(image, index) in props.images" :key="index" class="swiper-slide">
          <img :src="image" alt="Фот" class="product-gallery__image" />
        </div>
      </div>

      <div class="swiper-pagination"></div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
  .product-gallery {
    width: 100%;
    min-width: 0;
    max-width: 660px;
  }

  .product-gallery__desktop {
    display: grid;
    grid-template-columns: 114px minmax(0, 1fr);
    gap: 20px 36px;
  }

  .product-gallery__miniatures {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .product-gallery__miniature {
    width: 100%;
    overflow: hidden;
    cursor: pointer;
    border-radius: 8px;
  }

  .product-gallery__miniature img {
    display: block;
    width: 100%;
    aspect-ratio: 120/120;
    object-fit: cover;
  }

  .product-gallery__active-image {
    display: block;
    width: 100%;
    aspect-ratio: 540 / 600;
    object-fit: cover;
    border-radius: 8px;
  }

  .product-gallery__slider {
    display: none;
  }

  .product-image-enter-active,
  .product-image-leave-active {
    transition: opacity 0.2s ease;
  }

  .product-image-enter-from,
  .product-image-leave-to {
    opacity: 0;
  }

  .product-gallery__progress {
    grid-column: 2;
    height: 2px;
    background-color: $color-light-gray;
  }

  .product-gallery__progress-active {
    height: 100%;
    background-color: $color-dark-gray;
    transition: transform 0.2s ease;
  }

  @media (max-width: $breakpoints-m) {
    .product-gallery {
      max-width: none;
    }

    .product-gallery__desktop {
      display: none;
    }

    .product-gallery__slider {
      display: block;
      width: 100%;
    }

    .product-gallery__slider .swiper-slide {
      height: auto;
      aspect-ratio: 288 / 374;
      overflow: hidden;
      border-radius: 6px;
    }

    .product-gallery__image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }

    .product-gallery__slider .swiper-wrapper {
      height: auto;
    }

    .product-gallery__slider :deep(.swiper-pagination) {
      position: static;
      display: flex;
      width: 100%;
      height: 2px;
      margin-top: 14px;
      background-color: $color-gray;
    }

    .product-gallery__slider :deep(.swiper-pagination-bullet) {
      flex: 1;
      height: 2px;
      margin: 0;
      background-color: $color-gray;
      border-radius: 0;
      opacity: 1;
    }

    .product-gallery__slider :deep(.swiper-pagination-bullet-active) {
      background-color: $color-dark-gray;
    }
  }
</style>
