<script setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import Swiper from 'swiper'
  import { Navigation, Pagination } from 'swiper/modules'
  import { useGetRandomPhotos } from '@/composables/useGetRandomPhotos'
  import 'swiper/css'
  import 'swiper/css/navigation'
  import 'swiper/css/pagination'

  const { data: photos } = await useGetRandomPhotos(10)
  const swiper = ref(null)

  const imageUrls = computed(() => {
    return photos.value?.map((photo) => photo.download_url) ?? []
  })

  watch(imageUrls, async () => {
    await nextTick()
    swiper.value?.update()
  })

  onMounted(() => {
    swiper.value = new Swiper('.swiper', {
      modules: [Navigation, Pagination],
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      lazyPreloadPrevNext: 1,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    })
  })
</script>

<template>
  <div class="home-slider container">
    <div class="swiper">
      <div class="swiper-wrapper">
        <div v-for="url in imageUrls" :key="url" class="swiper-slide">
          <img :src="url" alt="Slide Photo" class="home-slider__image" loading="lazy" />
          <div class="swiper-lazy-preloader"></div>
          <TextBlockSlider class="home-slider__text" />
        </div>
      </div>
      <div class="swiper-pagination"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  :deep(.swiper-pagination) {
    bottom: 4px;
  }

  :deep(.swiper-pagination-bullet) {
    position: relative;
    width: 24px;
    height: 24px;
    margin: 0 -6px !important;
    background-color: transparent;
    opacity: 1;

    &::before {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 4px;
      height: 4px;
      content: '';
      background-color: $color-white;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
  }

  :deep(.swiper-pagination-bullet-active) {
    background-color: transparent;

    &::before {
      width: 9px;
      height: 9px;
      background-color: transparent;
      border: 1px solid $color-white;
    }
  }

  @media (min-width: $breakpoints-m) {
    :deep(.swiper-pagination) {
      bottom: 8px;
    }

    :deep(.swiper-pagination-bullet) {
      margin: 0 2px !important;
    }

    :deep(.swiper-pagination-bullet-active)::before {
      width: 7px;
      height: 7px;
    }
  }

  .home-slider {
    position: relative;
    height: 354px;
    margin: 0 auto;
    margin-top: 16px;
    overflow: hidden;

    &__image {
      display: block;
      width: 100%;
      height: 100%;
    }

    &__text {
      position: absolute;
      bottom: 30px;
      left: 8px;
      z-index: 2;

      @media (min-width: $breakpoints-m) {
        top: 50%;
        bottom: auto;
        left: 34px;
        transform: translateY(-50%);
      }
    }

    @media (min-width: $breakpoints-m) {
      height: 646px;
    }

    @media (max-width: $breakpoints-m) {
      max-width: 768px;
    }
  }

  .swiper,
  .swiper-wrapper,
  .swiper-slide {
    width: 100%;
    height: 100%;
  }

  .swiper-slide {
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 24px;
    background-color: #eee;
    border-radius: 16px;
  }

  :deep(.swiper-lazy-preloader) {
    --swiper-preloader-color: #{$color-white};
  }
</style>
