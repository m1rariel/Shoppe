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
  @use '~/assets/styles/variables' as *;
  @use '~/assets/styles/breakpoints' as *;

  :deep(.swiper-pagination-bullet) {
    width: 4px;
    height: 4px;
    background-color: $color-white;
    opacity: 1;
  }

  :deep(.swiper-pagination-bullet-active) {
    width: 7px;
    height: 7px;
    background-color: transparent;
    border: 1px solid $color-white;
    opacity: 1;
  }

  .home-slider {
    position: relative;
    height: 646px;
    margin: 0 auto;
    margin-top: 16px;
    overflow: hidden;
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

  .home-slider__image {
    display: block;
    width: 100%;
    height: 100%;
  }

  .home-slider__text {
    position: absolute;
    top: 50%;
    left: 34px;
    z-index: 2;
    transform: translateY(-50%);
  }

  :deep(.swiper-lazy-preloader) {
    --swiper-preloader-color: #{$color-white};
  }
</style>
