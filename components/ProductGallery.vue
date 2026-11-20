<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
  import Swiper from 'swiper'
  import { Pagination } from 'swiper/modules'
  import 'swiper/css'
  import 'swiper/css/pagination'

  const props = defineProps<{
    images: string[]
    productTitle?: string
  }>()

  const activeIndex = ref(0)
  const swiper = shallowRef<Swiper | null>(null)
  const slider = ref<HTMLElement | null>(null)
  const pagination = ref<HTMLElement | null>(null)
  const failedImages = ref(new Set<string>())

  const viewer = ref<{
    open: (image: string, source: HTMLElement) => void
    close: () => void
    closeImage: (image: string) => void
  } | null>(null)
  const hoverOrigin = ref('50% 50%')
  const hovering = ref(false)
  const activeImage = computed(() => props.images[activeIndex.value])
  let pointerStart: { x: number; y: number } | null = null
  let dragged = false

  const resetHover = () => {
    hovering.value = false
  }

  const openViewer = (image: string, event: MouseEvent, mobile = false) => {
    const instance = swiper.value
    const swiperBlocksClick = instance && 'allowClick' in instance && instance.allowClick === false
    if (
      !image ||
      failedImages.value.has(image) ||
      (mobile && event.detail !== 0 && (dragged || swiperBlocksClick))
    )
      return
    resetHover()
    viewer.value?.open(image, event.currentTarget as HTMLElement)
  }

  const failImage = (image: string) => {
    failedImages.value.add(image)
    resetHover()
    viewer.value?.closeImage(image)
  }

  const checkImage = (element: HTMLImageElement | null, image: string | undefined) => {
    if (image && element?.complete && element.naturalWidth === 0 && !failedImages.value.has(image))
      failImage(image)
  }

  const moveHover = (event: PointerEvent) => {
    if (
      event.pointerType !== 'mouse' ||
      !window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches
    )
      return
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const clamp = (value: number) => Math.max(0, Math.min(100, value))
    hoverOrigin.value = `${clamp(((event.clientX - bounds.left) / bounds.width) * 100)}% ${clamp(((event.clientY - bounds.top) / bounds.height) * 100)}%`
    hovering.value = true
  }

  const startPointer = (event: PointerEvent) => {
    pointerStart = { x: event.clientX, y: event.clientY }
    dragged = false
  }

  const trackPointer = (event: PointerEvent) => {
    if (
      pointerStart &&
      Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8
    )
      dragged = true
  }

  const cancelPointer = () => {
    dragged = true
    pointerStart = null
  }

  const endPointer = (event: PointerEvent) => {
    trackPointer(event)
    pointerStart = null
  }

  watch(activeIndex, resetHover)
  const selectImage = (index: number) => {
    activeIndex.value = index
    swiper.value?.slideTo(index)
  }

  const initialize = () => {
    swiper.value?.destroy(true, true)
    swiper.value = null
    if (!slider.value || props.images.length < 2) return
    swiper.value = new Swiper(slider.value, {
      modules: [Pagination],
      slidesPerView: 1,
      spaceBetween: 0,
      loop: false,
      initialSlide: activeIndex.value,
      pagination: { el: pagination.value, clickable: true },
      on: {
        slideChange(instance) {
          activeIndex.value = instance.activeIndex
        },
      },
    })
  }

  onMounted(initialize)
  watch(
    () => props.images,
    async () => {
      viewer.value?.close()
      resetHover()
      pointerStart = null
      dragged = false
      activeIndex.value = 0
      failedImages.value = new Set()
      await nextTick()
      initialize()
    },
    { deep: true },
  )
  onBeforeUnmount(() => {
    viewer.value?.close()
    swiper.value?.destroy(true, true)
    swiper.value = null
  })
</script>
<template>
  <div class="product-gallery" :class="{ 'product-gallery--single': images.length < 2 }">
    <div class="product-gallery__desktop">
      <div v-if="images.length > 1" class="product-gallery__miniatures">
        <button
          v-for="(image, index) in props.images"
          :key="index"
          type="button"
          class="product-gallery__miniature"
          :class="{ 'product-gallery__miniature--active': activeIndex === index }"
          :aria-label="`View image ${index + 1} of ${images.length}`"
          :aria-pressed="activeIndex === index"
          @click="selectImage(index)"
        >
          <img
            v-if="!failedImages.has(image)"
            :ref="(element) => checkImage(element as HTMLImageElement | null, image)"
            :src="image"
            alt=""
            @error="failImage(image)"
          />
          <span v-else>Image unavailable</span>
        </button>
      </div>
      <button
        v-if="activeImage && !failedImages.has(activeImage)"
        type="button"
        class="product-gallery__stage"
        :aria-label="`Open enlarged image of ${productTitle || 'product'}`"
        aria-haspopup="dialog"
        @pointermove="moveHover"
        @pointerleave="resetHover"
        @click="openViewer(activeImage, $event)"
      >
        <img
          :key="activeIndex"
          :ref="(element) => checkImage(element as HTMLImageElement | null, activeImage)"
          :src="activeImage"
          :alt="productTitle || 'Product image'"
          class="product-gallery__active-image"
          :style="{ transform: hovering ? 'scale(2)' : 'scale(1)', transformOrigin: hoverOrigin }"
          @error="failImage(activeImage)"
        />
      </button>
      <div v-else class="product-gallery__fallback">Image unavailable</div>

      <div v-if="props.images.length > 1" class="product-gallery__progress">
        <div
          class="product-gallery__progress-active"
          :style="{
            width: `${100 / props.images.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }"
        ></div>
      </div>
    </div>
    <div
      ref="slider"
      class="swiper product-gallery__slider"
      aria-label="Product images"
      @pointerdown.capture="startPointer"
      @pointermove.capture="trackPointer"
      @pointerup.capture="endPointer"
      @pointercancel.capture="cancelPointer"
    >
      <div class="swiper-wrapper">
        <div v-for="(image, index) in props.images" :key="index" class="swiper-slide">
          <button
            v-if="!failedImages.has(image)"
            type="button"
            class="product-gallery__mobile-opener"
            :tabindex="activeIndex === index ? 0 : -1"
            :aria-label="`Open enlarged image ${index + 1} of ${productTitle || 'product'}`"
            aria-haspopup="dialog"
            @click="openViewer(image, $event, true)"
          >
            <img
              :ref="(element) => checkImage(element as HTMLImageElement | null, image)"
              :src="image"
              :alt="`${productTitle || 'Product image'} — ${index + 1}`"
              class="product-gallery__image"
              @error="failImage(image)"
            />
          </button>
          <div v-else class="product-gallery__fallback">Image unavailable</div>
        </div>
      </div>

      <div v-if="!images.length" class="product-gallery__fallback">Image unavailable</div>
      <div v-show="images.length > 1" ref="pagination" class="swiper-pagination"></div>
    </div>
    <ProductImageViewer ref="viewer" :product-title="productTitle" @image-error="failImage" />
  </div>
</template>
<style lang="scss" scoped>
  .product-gallery {
    width: 100%;
    min-width: 0;
    max-width: 700px;
  }

  .product-gallery__desktop {
    display: grid;
    grid-template-columns: minmax(64px, 120px) minmax(0, 1fr);
    gap: 24px 40px;

    @media (width < $breakpoints-l) {
      grid-template-columns: 64px minmax(0, 1fr);
      gap: 16px;
    }
  }

  .product-gallery__miniatures {
    display: flex;
    flex-direction: column;
    gap: 16px;
    justify-content: space-between;
  }

  .product-gallery__miniature {
    width: 100%;
    overflow: hidden;
    cursor: pointer;
    border-radius: 8px;

    &--active {
      outline: 2px solid $color-dark-gray;
      outline-offset: 2px;
    }

    &:focus-visible {
      outline: 2px solid $color-black;
      outline-offset: 4px;
    }
  }

  .product-gallery__miniature img {
    display: block;
    width: 100%;
    aspect-ratio: 120/120;
    object-fit: cover;
  }

  .product-gallery__stage {
    overflow: hidden;
    cursor: zoom-in;
    border-radius: 8px;
  }

  .product-gallery__mobile-opener {
    display: block;
    width: 100%;
    height: 100%;
    cursor: zoom-in;
  }

  .product-gallery__stage,
  .product-gallery__mobile-opener {
    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: -3px;
    }
  }

  .product-gallery__active-image {
    display: block;
    width: 100%;
    aspect-ratio: 540 / 600;
    object-fit: cover;
    border-radius: 8px;
  }

  .product-gallery--single .product-gallery__desktop {
    grid-template-columns: minmax(0, 1fr);
    max-width: 540px;
    margin-inline: auto;
  }

  .product-gallery--single {
    @media (width < $breakpoints-m) {
      padding-bottom: 16px;
    }
  }

  .product-gallery__fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 540 / 600;
    padding: 16px;
    font-size: 14px;
    color: $color-dark-gray;
    background: $color-light-gray;
    border-radius: 8px;

    @media (width < $breakpoints-m) {
      height: 100%;
      aspect-ratio: 288 / 374;
      border-radius: 6px;
    }
  }

  .product-gallery__slider {
    display: none;
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

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  @media (width < $breakpoints-m) {
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
