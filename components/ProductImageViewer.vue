<script setup lang="ts">
  import { onBeforeUnmount, ref } from 'vue'
  import { useImageZoom } from '~/composables/useImageZoom'

  defineProps<{ productTitle?: string }>()
  const emit = defineEmits<{ 'image-error': [image: string] }>()

  const dialog = ref<HTMLDialogElement | null>(null)
  const viewerViewport = ref<HTMLElement | null>(null)
  const viewerImage = ref('')
  let opener: HTMLElement | null = null
  let previousOverflow: string | undefined

  const { scale, resetZoom, changeScale, startPointer, movePointer, endPointer, cancelPointers } =
    useImageZoom(viewerViewport, () => Boolean(viewerImage.value))

  const close = () => {
    resetZoom()
    if (dialog.value?.open) dialog.value.close()
    viewerImage.value = ''
    if (previousOverflow !== undefined) {
      document.body.style.overflow = previousOverflow
      previousOverflow = undefined
    }
    if (opener?.isConnected) opener.focus({ preventScroll: true })
    opener = null
  }

  const open = (image: string, source: HTMLElement) => {
    if (viewerImage.value || !image) return
    resetZoom()
    viewerImage.value = image
    opener = source
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.value?.showModal()
  }

  const failImage = () => {
    const image = viewerImage.value
    close()
    emit('image-error', image)
  }

  const checkImage = (element: HTMLImageElement | null) => {
    if (viewerImage.value && element?.complete && element.naturalWidth === 0) failImage()
  }

  const closeImage = (image: string) => {
    if (viewerImage.value === image) close()
  }

  onBeforeUnmount(close)
  defineExpose({ open, close, closeImage })
</script>
<template>
  <dialog
    ref="dialog"
    class="product-gallery__viewer"
    aria-label="Enlarged product image"
    @cancel.prevent="close"
  >
    <div class="product-gallery__viewer-toolbar">
      <button type="button" :disabled="scale <= 1" aria-label="Zoom out" @click="changeScale(-0.5)">
        −
      </button>
      <output aria-live="polite" aria-label="Image scale">{{ Math.round(scale * 100) }}%</output>
      <button type="button" :disabled="scale >= 4" aria-label="Zoom in" @click="changeScale(0.5)">
        +
      </button>
      <button type="button" @click="resetZoom">Reset zoom</button>
      <button type="button" autofocus aria-label="Close image viewer" @click="close">Close</button>
    </div>
    <div
      ref="viewerViewport"
      class="product-gallery__viewer-scroll"
      tabindex="0"
      aria-label="Enlarged image, scroll to explore"
      @pointerdown="startPointer"
      @pointermove="movePointer"
      @pointerup="endPointer"
      @pointercancel="cancelPointers"
      @lostpointercapture="endPointer"
    >
      <div
        class="product-gallery__viewer-canvas"
        :style="{ width: `${scale * 100}%`, height: `${scale * 100}%` }"
      >
        <img
          v-if="viewerImage"
          :ref="(element) => checkImage(element as HTMLImageElement | null)"
          :src="viewerImage"
          :alt="productTitle || 'Product image'"
          @error="failImage()"
        />
      </div>
    </div>
  </dialog>
</template>
<style lang="scss" scoped>
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

  .product-gallery__viewer button {
    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: -3px;
    }
  }
</style>
