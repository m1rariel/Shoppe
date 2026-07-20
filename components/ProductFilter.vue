<script setup lang="ts">
  import FiltersIcon from '@/assets/icons/filters-icon.svg'
  import SearchIcon from '@/assets/icons/search-icon-filter.svg'
  import CloseIcon from '@/assets/icons/close-icon.svg'
  import { ref } from '#imports'

  type ProductFilters = {
    search: string
    category: string
    sortBy: string
    onSale: boolean
    inStock: boolean
  }

  const props = defineProps<{
    filters: ProductFilters
    categories: string[]
  }>()

  const emit = defineEmits<{
    'update:filters': (filters: ProductFilters) => void
  }>()

  const isOpen = ref(false)

  const updateFilter = <Key extends keyof ProductFilters>(key: Key, value: ProductFilters[Key]) => {
    emit('update:filters', {
      ...props.filters,
      [key]: value,
    })
  }
</script>
<template>
  <aside class="product-filters">
    <button class="product-filters__mobile-toggle" type="button" @click="isOpen = true">
      <FiltersIcon class="product-filters__mobile-icon" aria-hidden="true" />
      <span class="product-filters__title">Filters</span>
    </button>

    <div class="product-filters__controls" :class="{ 'product-filters__controls--open': isOpen }">
      <div class="product-filters__mobile-header">
        <h2 class="product-filters__mobile-heading">Filters</h2>

        <button class="product-filters__close" type="button" @click="isOpen = false">
          <CloseIcon width="16px" height="16px" />
        </button>
      </div>
      <div class="product-filters__search">
        <BaseInput
          class="product-filters__input"
          placeholder="Search..."
          :model-value="filters.search"
          @update:model-value="updateFilter('search', $event)"
        />

        <SearchIcon class="product-filters__search-icon" width="19px" height="19px" />
      </div>
      <div class="product-filters__select-inner">
        <div class="product-filters__select">
          <select
            :value="filters.category"
            @change="updateFilter('category', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Category</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div class="product-filters__select">
          <select
            :value="filters.sortBy"
            @change="updateFilter('sortBy', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Sort By</option>
            <option value="price-minus">Цена: от меньшего к большему</option>
            <option value="price-plus">Цена: от большего к меньшему</option>
            <option value="title-filter">Название: от А до Я</option>
          </select>
        </div>
      </div>
      <div class="product-filters__state-inner">
        <div class="product-filters__state">
          <p class="product-filters__state-title">On sale</p>
          <div class="product-filters__state-toggle">
            <label class="switch">
              <input type="checkbox" />
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
              <input type="checkbox" />
              <span></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
<style lang="scss" scoped>
  @use '~/assets/styles/breakpoints' as *;

  .product-filters__state-inner {
    margin-top: 40px;
  }

  .product-filters__state-inner + .product-filters__state-inner {
    margin-top: 32px;
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
    width: 48px;
    height: 26px;
    cursor: pointer;
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
    transition: background-color 0.2s ease;
  }

  .switch span::before {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 18px;
    height: 18px;
    content: '';
    background-color: $color-white;
    border-radius: 50%;
    transition: transform 0.2s ease;
  }

  .product-filters__mobile-header {
    display: none;
  }

  .product-filters__controls {
    display: none;
  }

  .product-filters__controls--open {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: block;
    padding: 20px;
    overflow-y: auto;
    background-color: $color-white;
  }

  .product-filters__controls--open .product-filters__mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .product-filters__mobile-heading {
    font-family: $font-accent;
    font-size: 25px;
    font-weight: $font-weight-regular;
    line-height: 40.5px;
    color: $color-black;
  }

  .product-filters__close {
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
    gap: 22px;
    align-items: center;
    padding: 0;
    font-family: $font-main;
    font-size: 26px;
    font-weight: $font-weight-regular;
    line-height: 34px;
    color: $color-accent;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .product-filters__select-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 40px;
  }

  .product-filters__input {
    padding-bottom: 11px;
    margin-top: 41px;
    border-bottom: 1px solid $color-dark-gray;
  }

  .product-filters__search {
    position: relative;
  }

  .product-filters__search-icon {
    position: absolute;
    right: 0;
    bottom: 12px;
    width: 20px;
    height: 20px;
  }

  .product-filters__select {
    position: relative;
    width: 100%;
  }

  .product-filters__select select {
    width: 100%;
    height: 54px;
    padding: 0 44px 0 12px;
    font-family: $font-main;
    font-size: 14px;
    font-weight: $font-weight-regular;
    color: $color-black;
    appearance: none;
    background-color: $color-white;
    border: 1px solid $color-light-gray;
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

  @media (min-width: $breakpoints-m) {
    .product-filters__mobile-toggle {
      display: none;
    }

    .product-filters__controls {
      display: block;
    }
  }
</style>
