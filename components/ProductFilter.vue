<script setup lang="ts">
  import SearchIcon from '@/assets/icons/search-icon-filter.svg'
</script>
<template>
  <aside class="product-filters">
    <div class="product-filters__search">
      <BaseInput class="product-filters__input" placeholder="Search..." disabled />
      <SearchIcon class="product-filters__search-icon" width="19px" height="19px" />
    </div>
    <div class="product-filters__select-inner">
      <div class="product-filters__select">
        <select disabled>
          <option>Category</option>
        </select>
      </div>
      <div class="product-filters__select">
        <select disabled>
          <option>Sort By</option>
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
  </aside>
</template>
<style lang="scss" scoped>
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
    border: 1px solid $color-dark-gray;
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
</style>
