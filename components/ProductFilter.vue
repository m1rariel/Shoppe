<script setup lang="ts">
  import FiltersIcon from '@/assets/icons/filters-icon.svg'
  import SearchIcon from '@/assets/icons/search-icon-filter.svg'
  import CloseIcon from '@/assets/icons/close-icon.svg'
  import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { useIsMobile } from '#imports'
  import { ProductSort } from '~/types/api'

  import type { ProductFilters } from '~/types/catalog'

  defineProps<{
    filters: ProductFilters
    searchDraft: string
    categories: string[]
  }>()

  const emit = defineEmits<{
    search: [value: string | number | undefined]
    category: [value: string]
    sort: [value: ProductFilters['sortBy']]
  }>()

  const isOpen = ref(false)
  const isMobile = useIsMobile()
  const trigger = ref<HTMLButtonElement | null>(null)
  const panel = ref<HTMLDivElement | null>(null)
  const searchInput = ref<HTMLInputElement | null>(null)
  let previousOverflow: string | undefined

  const closePanel = () => {
    isOpen.value = false
    if (isMobile.value) trigger.value?.focus()
  }
  const openPanel = async () => {
    isOpen.value = true
    await nextTick()
    searchInput.value?.focus()
  }
  const handleKeydown = (event: KeyboardEvent) => {
    if (!isOpen.value || !isMobile.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closePanel()
    } else if (event.key === 'Tab') {
      const controls = panel.value?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
      )
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }
  const restoreScroll = () => {
    if (previousOverflow !== undefined) {
      document.body.style.overflow = previousOverflow
      previousOverflow = undefined
    }
  }
  watch(isOpen, (open) => {
    if (open) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    } else restoreScroll()
  })
  watch(isMobile, (mobile) => {
    if (!mobile) isOpen.value = false
  })
  onBeforeUnmount(restoreScroll)
</script>
<template>
  <aside class="product-filters">
    <button
      ref="trigger"
      class="product-filters__mobile-toggle"
      type="button"
      :aria-expanded="isOpen"
      aria-controls="catalog-filters"
      @click="openPanel"
    >
      <FiltersIcon class="product-filters__mobile-icon" viewBox="0 0 18 18" aria-hidden="true" />
      <span class="product-filters__title">Filters</span>
    </button>

    <div
      id="catalog-filters"
      ref="panel"
      class="product-filters__controls"
      :class="{ 'product-filters__controls--open': isOpen }"
      :role="isOpen && isMobile ? 'dialog' : undefined"
      :aria-modal="isOpen && isMobile ? true : undefined"
      aria-label="Product filters"
      @keydown="handleKeydown"
    >
      <div class="product-filters__mobile-header">
        <h2 class="product-filters__mobile-heading">Filters</h2>

        <button
          class="product-filters__close"
          type="button"
          aria-label="Close filters"
          @click="closePanel"
        >
          <CloseIcon width="16px" height="16px" aria-hidden="true" />
        </button>
      </div>
      <div class="product-filters__search">
        <input
          ref="searchInput"
          type="search"
          aria-label="Search products"
          class="product-filters__input"
          placeholder="Search..."
          :value="searchDraft"
          @input="emit('search', ($event.target as HTMLInputElement).value)"
        />

        <SearchIcon
          class="product-filters__search-icon"
          viewBox="0 0 19.7597 19.7485"
          aria-hidden="true"
        />
      </div>
      <div class="product-filters__select-inner">
        <div class="product-filters__select">
          <select
            aria-label="Category"
            :value="filters.category"
            @change="emit('category', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Category</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div class="product-filters__select">
          <select
            aria-label="Sort products"
            :value="filters.sortBy"
            @change="emit('sort', ($event.target as HTMLSelectElement).value as ProductSort | '')"
          >
            <option value="">Sort By</option>
            <option :value="ProductSort.PriceAsc">Цена: от меньшего к большему</option>
            <option :value="ProductSort.PriceDesc">Цена: от большего к меньшему</option>
            <option :value="ProductSort.TitleAsc">Название: от А до Я</option>
          </select>
        </div>
      </div>
      <div class="product-filters__state-inner">
        <div class="product-filters__state">
          <p class="product-filters__state-title">On sale</p>
          <div class="product-filters__state-toggle">
            <label class="switch">
              <input
                type="checkbox"
                aria-label="On sale"
                disabled
                aria-describedby="unavailable-product-filters"
              />
              <span></span>
            </label>
          </div>
        </div>
      </div>
      <div class="product-filters__state-inner">
        <div class="product-filters__state">
          <p class="product-filters__state-title">In stock</p>
          <div class="product-filters__state-toggle">
            <label class="switch">
              <input
                type="checkbox"
                aria-label="In stock"
                disabled
                aria-describedby="unavailable-product-filters"
              />
              <span></span>
            </label>
          </div>
        </div>
      </div>
      <p id="unavailable-product-filters">Sale and stock filters are currently unavailable.</p>
    </div>
  </aside>
</template>
<style lang="scss" scoped>
  @use '~/assets/styles/breakpoints' as *;

  .product-filters__state-inner {
    margin-top: 40px;
  }

  .product-filters__state-inner + .product-filters__state-inner {
    margin-top: 42px;
  }

  .product-filters__state {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .product-filters__state-title {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
  }

  .switch {
    position: relative;
    display: inline-flex;
    width: 33.333px;
    height: 20px;
    cursor: not-allowed;
    opacity: 0.5;

    @media (width < $breakpoints-m) {
      width: 44px;
      height: 24px;
    }
  }

  .switch input {
    position: absolute;
    pointer-events: none;
    opacity: 0;
  }

  .switch span {
    position: absolute;
    inset: 0;
    background-color: $color-dark-gray;
    border-radius: 999px;
  }

  .switch span::before {
    position: absolute;
    top: 3.333px;
    left: 3.333px;
    width: 13.333px;
    height: 13.333px;
    content: '';
    background-color: $color-white;
    border-radius: 50%;

    @media (width < $breakpoints-m) {
      top: 4px;
      left: 4px;
      width: 16px;
      height: 16px;
    }
  }

  .product-filters__mobile-header {
    display: none;
  }

  .product-filters__controls {
    display: none;

    @media (width >= $breakpoints-m) {
      display: block;
    }
  }

  .product-filters__controls--open {
    @media (width < $breakpoints-m) {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: block;
      padding: max(4px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
      overflow-y: auto;
      overscroll-behavior: contain;
      background-color: $color-white;
    }
  }

  .product-filters__controls--open .product-filters__mobile-header {
    @media (width < $breakpoints-m) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 40.5px;
      margin-bottom: 27.5px;
    }
  }

  .product-filters__mobile-heading {
    margin: 0;
    font-family: $font-accent;
    font-size: 25px;
    font-weight: $font-weight-regular;
    line-height: 40.5px;
    color: $color-black;
  }

  .product-filters__close {
    position: absolute;
    top: max(2px, env(safe-area-inset-top));
    right: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    font-size: 36px;
    line-height: 1;
    color: $color-black;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .product-filters__title {
    font-family: $font-main;
    font-size: 12px;
    font-weight: $font-weight-regular;
    line-height: 20px;
    color: $color-accent;
  }

  .product-filters__mobile-toggle {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    padding: 0;
    font-family: $font-main;
    font-size: 12px;
    font-weight: $font-weight-regular;
    line-height: 20px;
    color: $color-accent;
    cursor: pointer;
    background: none;
    border: 0;

    @media (width >= $breakpoints-m) {
      display: none;
    }
  }

  .product-filters__mobile-icon {
    display: block;
    width: 16px;
    height: 16px;
  }

  .product-filters__select-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 39px;
  }

  .product-filters__input {
    display: block;
    width: 100%;
    height: 35px;
    padding: 2px 32px 10px 0;
    margin: 0;
    font-family: $font-main;
    font-size: 14px;
    line-height: 22px;
    color: $color-dark-gray;
    background: transparent;
    border: none;
    border-bottom: 1px solid $color-dark-gray;
  }

  .product-filters__search {
    position: relative;
  }

  .product-filters__search-icon {
    position: absolute;
    top: 0;
    right: 0;
    width: 19px;
    height: 19px;
    pointer-events: none;
  }

  .product-filters__select {
    position: relative;
    width: 100%;
  }

  .product-filters__select select {
    width: 100%;
    height: 53px;
    padding: 0 44px 0 12px;
    font-family: $font-main;
    font-size: 14px;
    font-weight: $font-weight-regular;
    color: $color-black;
    appearance: none;
    background-color: $color-white;
    border: 1px solid $color-gray;
    border-radius: 4px;
  }

  .product-filters__select::after {
    position: absolute;
    top: 50%;
    right: 19px;
    width: 10px;
    height: 10px;
    pointer-events: none;
    content: '';
    border-right: 2px solid $color-black;
    border-bottom: 2px solid $color-black;
    transform: translateY(-65%) rotate(45deg);
  }

  #unavailable-product-filters {
    margin-top: 24px;
    font-size: 12px;
    line-height: 20px;
    color: $color-dark-gray;
  }
</style>
