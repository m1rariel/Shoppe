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

  const dialog = ref<HTMLDialogElement | null>(null)
  const viewerViewport = ref<HTMLElement | null>(null)
  const viewerImage = ref('')
  const scale = ref(1)
  const hoverOrigin = ref('50% 50%')
  const hovering = ref(false)
  const activeImage = computed(() => props.images[activeIndex.value])
  let opener: HTMLElement | null = null
  let previousOverflow: string | undefined
  let pointerStart: { x: number; y: number } | null = null
  let dragged = false

  const resetHover = () => {
    hovering.value = false
  }
  type Point = { x: number; y: number }
  const pointers = new Map<number, Point>()
  let gesture: { points: Point[]; scale: number; scroll: Point } | null = null
  let pendingScrollPosition: Point | null = null
  let scrollUpdateId = 0
  const clearGesture = () => {
    const pointerIds = [...pointers.keys()]
    pointers.clear()
    gesture = null
    pendingScrollPosition = null
    scrollUpdateId++
    for (const id of pointerIds) {
      if (viewerViewport.value?.hasPointerCapture(id))
        viewerViewport.value.releasePointerCapture(id)
    }
  }
  const resetZoom = () => {
    clearGesture()
    scale.value = 1
    if (viewerViewport.value) {
      viewerViewport.value.scrollLeft = 0
      viewerViewport.value.scrollTop = 0
    }
  }
  const rebaseGesture = () => {
    const viewport = viewerViewport.value
    gesture =
      viewport && pointers.size
        ? {
            points: [...pointers.values()].slice(0, 2),
            scale: scale.value,
            scroll: pendingScrollPosition || { x: viewport.scrollLeft, y: viewport.scrollTop },
          }
        : null
  }
  const setScroll = (point: Point) => {
    const viewport = viewerViewport.value
    if (!viewport) return
    pendingScrollPosition = {
      x: Math.max(0, Math.min(viewport.clientWidth * (scale.value - 1), point.x)),
      y: Math.max(0, Math.min(viewport.clientHeight * (scale.value - 1), point.y)),
    }
    const updateId = ++scrollUpdateId
    void nextTick(() => {
      if (updateId !== scrollUpdateId || !viewerImage.value || !pendingScrollPosition) return
      viewport.scrollLeft = Math.min(
        Math.max(0, viewport.scrollWidth - viewport.clientWidth),
        pendingScrollPosition.x,
      )
      viewport.scrollTop = Math.min(
        Math.max(0, viewport.scrollHeight - viewport.clientHeight),
        pendingScrollPosition.y,
      )
      pendingScrollPosition = null
    })
  }
  const startViewerPointer = (event: PointerEvent) => {
    if (!viewerImage.value || !['touch', 'pen'].includes(event.pointerType)) return
    event.preventDefault()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    viewerViewport.value?.setPointerCapture(event.pointerId)
    rebaseGesture()
  }
  const moveViewerPointer = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId) || !gesture) return
    event.preventDefault()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointers.values()].slice(0, 2)
    const startPoints = gesture.points
    if (points.length === 1) {
      if (scale.value > 1)
        setScroll({
          x: gesture.scroll.x + startPoints[0].x - points[0].x,
          y: gesture.scroll.y + startPoints[0].y - points[0].y,
        })
      return
    }
    const distance = (pair: Point[]) => Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y)
    const startDistance = distance(startPoints)
    if (!startDistance) {
      rebaseGesture()
      return
    }
    const bounds = viewerViewport.value!.getBoundingClientRect()
    const midpoint = (pair: Point[]) => ({
      x: (pair[0].x + pair[1].x) / 2 - bounds.left,
      y: (pair[0].y + pair[1].y) / 2 - bounds.top,
    })
    const startMidpoint = midpoint(startPoints)
    const currentMidpoint = midpoint(points)
    scale.value = Math.max(1, Math.min(4, (gesture.scale * distance(points)) / startDistance))
    setScroll({
      x: ((gesture.scroll.x + startMidpoint.x) * scale.value) / gesture.scale - currentMidpoint.x,
      y: ((gesture.scroll.y + startMidpoint.y) * scale.value) / gesture.scale - currentMidpoint.y,
    })
  }
  const endViewerPointer = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return
    rebaseGesture()
    if (viewerViewport.value?.hasPointerCapture(event.pointerId)) {
      viewerViewport.value.releasePointerCapture(event.pointerId)
    }
  }
  const closeViewer = () => {
    clearGesture()
    if (dialog.value?.open) dialog.value.close()
    viewerImage.value = ''
    scale.value = 1
    const viewport = viewerViewport.value
    if (viewport) {
      viewport.scrollTop = 0
      viewport.scrollLeft = 0
    }
    if (previousOverflow !== undefined) {
      document.body.style.overflow = previousOverflow
      previousOverflow = undefined
    }
    if (opener?.isConnected) opener.focus({ preventScroll: true })
    opener = null
  }
  const openViewer = (image: string, event: MouseEvent, mobile = false) => {
    const instance = swiper.value
    const swiperBlocksClick = instance && 'allowClick' in instance && instance.allowClick === false
    if (
      viewerImage.value ||
      !image ||
      failedImages.value.has(image) ||
      (mobile && event.detail !== 0 && (dragged || swiperBlocksClick))
    )
      return
    resetHover()
    scale.value = 1
    viewerImage.value = image
    opener = event.currentTarget as HTMLElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.value?.showModal()
  }
  const failImage = (image: string) => {
    failedImages.value.add(image)
    resetHover()
    if (viewerImage.value === image) closeViewer()
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
  const changeScale = (step: number) => {
    const position = pendingScrollPosition || {
      x: viewerViewport.value?.scrollLeft || 0,
      y: viewerViewport.value?.scrollTop || 0,
    }
    clearGesture()
    scale.value = Math.max(1, Math.min(4, scale.value + step))
    setScroll(position)
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
      closeViewer()
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
    closeViewer()
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
          <img v-if="!failedImages.has(image)" :src="image" alt="" @error="failImage(image)" />
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
    <dialog
      ref="dialog"
      class="product-gallery__viewer"
      aria-label="Enlarged product image"
      @cancel.prevent="closeViewer"
    >
      <div class="product-gallery__viewer-toolbar">
        <button
          type="button"
          :disabled="scale <= 1"
          aria-label="Zoom out"
          @click="changeScale(-0.5)"
        >
          −
        </button>
        <output aria-live="polite" aria-label="Image scale">{{ Math.round(scale * 100) }}%</output>
        <button type="button" :disabled="scale >= 4" aria-label="Zoom in" @click="changeScale(0.5)">
          +
        </button>
        <button type="button" @click="resetZoom">Reset zoom</button>
        <button type="button" autofocus aria-label="Close image viewer" @click="closeViewer">
          Close
        </button>
      </div>
      <div
        ref="viewerViewport"
        class="product-gallery__viewer-scroll"
        tabindex="0"
        aria-label="Enlarged image, scroll to explore"
        @pointerdown="startViewerPointer"
        @pointermove="moveViewerPointer"
        @pointerup="endViewerPointer"
        @pointercancel="endViewerPointer"
        @lostpointercapture="endViewerPointer"
      >
        <div
          class="product-gallery__viewer-canvas"
          :style="{ width: `${scale * 100}%`, height: `${scale * 100}%` }"
        >
          <img
            v-if="viewerImage"
            :src="viewerImage"
            :alt="productTitle || 'Product image'"
            @error="failImage(viewerImage)"
          />
        </div>
      </div>
    </dialog>
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

  .product-gallery__viewer {
    position: fixed;
    width: min(1100px, calc(100% - 32px));
    max-width: none;
    height: calc(100dvh - 32px);
    max-height: none;
    padding: 16px;
    margin: auto;
    color: $color-black;
    background: $color-white;
    border: 1px solid $color-gray;
    border-radius: 8px;

    &::backdrop {
      background: rgb(0 0 0 / 65%);
    }

    @media (width < $breakpoints-m) {
      width: 100%;
      height: 100dvh;
      padding: 12px;
      border-radius: 0;
    }
  }

  .product-gallery__viewer-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: center;
    padding-bottom: 12px;

    button {
      min-width: 44px;
      min-height: 44px;
      padding: 8px;
      cursor: pointer;
      border: 1px solid $color-gray;
      border-radius: 4px;

      &:disabled {
        color: $color-dark-gray;
        cursor: default;
      }
    }

    output {
      min-width: 48px;
      text-align: center;
    }
  }

  .product-gallery__viewer[open] {
    display: flex;
    flex-direction: column;
  }

  .product-gallery__viewer-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    touch-action: none;
  }

  .product-gallery__viewer-canvas {
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .product-gallery__stage,
  .product-gallery__mobile-opener,
  .product-gallery__viewer button {
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
