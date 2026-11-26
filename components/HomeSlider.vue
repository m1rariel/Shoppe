<script setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
  import Swiper from 'swiper'
  import { Pagination } from 'swiper/modules'
  import { useGetRandomPhotos } from '@/composables/useGetRandomPhotos'
  import { createHomeSliderImage, homeSliderFallbackPhotos } from '@/utils/homeSliderPhotos'
  import 'swiper/css'
  import 'swiper/css/pagination'

  const { data: photos } = await useGetRandomPhotos(10)
  const swiper = shallowRef(null)
  const sliderElement = ref(null)
  const activeSlide = ref(0)
  const requestedSlides = ref(new Set([0]))
  const readySlides = new Set()

  const failedPhotoUrls = ref(new Set())

  const imageUrls = computed(() => {
    const urls = photos.value?.length
      ? photos.value.map((photo) => photo.download_url)
      : homeSliderFallbackPhotos

    return urls.map((url, index) =>
      failedPhotoUrls.value.has(url) ? homeSliderFallbackPhotos[index] : url,
    )
  })

  const images = computed(() => imageUrls.value.map(createHomeSliderImage))

  const handleImageLoad = (index) => {
    readySlides.add(index)
    if (index !== activeSlide.value) return

    const count = imageUrls.value.length
    requestedSlides.value.add((index + 1) % count)
    requestedSlides.value.add((index + count - 1) % count)
  }

  const handleImageError = (url, index) => {
    if (url === homeSliderFallbackPhotos[index] || failedPhotoUrls.value.has(url)) return

    failedPhotoUrls.value.add(url)
  }

  watch(imageUrls, async () => {
    await nextTick()
    swiper.value?.update()
  })

  onMounted(() => {
    sliderElement.value.querySelectorAll('img').forEach((image, index) => {
      if (!requestedSlides.value.has(index) || !image.complete) return

      if (image.naturalWidth === 0) handleImageError(imageUrls.value[index], index)
      else handleImageLoad(index)
    })

    swiper.value = new Swiper(sliderElement.value, {
      modules: [Pagination],
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      on: {
        slideChange(instance) {
          activeSlide.value = instance.realIndex
          requestedSlides.value.add(instance.realIndex)
          if (readySlides.has(instance.realIndex)) handleImageLoad(instance.realIndex)
        },
      },
    })
  })

  onBeforeUnmount(() => {
    swiper.value?.destroy(true, true)
  })
</script>

<template>
  <div class="home-slider container">
    <div ref="sliderElement" class="swiper">
      <div class="swiper-wrapper">
        <div v-for="(image, index) in images" :key="index" class="swiper-slide">
          <picture class="home-slider__picture">
            <source
              v-if="image.mobileSrcset && requestedSlides.has(index)"
              media="(width < 768px)"
              :srcset="image.mobileSrcset"
              sizes="calc(100vw - 32px)"
              width="800"
              height="800"
            />
            <img
              :src="requestedSlides.has(index) ? image.src : undefined"
              :srcset="requestedSlides.has(index) ? image.srcset : undefined"
              sizes="(min-width: 1440px) 1248px, (min-width: 768px) calc(100vw - 72px), calc(100vw - 32px)"
              :width="image.width"
              :height="image.height"
              alt="Slide Photo"
              class="home-slider__image"
              :loading="index === 0 ? 'eager' : 'lazy'"
              :fetchpriority="index === 0 ? 'high' : 'auto'"
              decoding="async"
              @load="handleImageLoad(index)"
              @error="handleImageError(imageUrls[index], index)"
            />
          </picture>
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

    &__picture,
    &__image {
      display: block;
      width: 100%;
      height: 100%;
    }

    &__image {
      object-fit: cover;
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
