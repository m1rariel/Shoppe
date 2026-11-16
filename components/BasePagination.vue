<script setup lang="ts">
  import NextIcon from '@/assets/icons/next-icon.svg'

  defineProps<{
    currentPage: number
    totalPages: number
    visiblePages: number[]
  }>()

  const emit = defineEmits<{
    changePage: [page: number]
  }>()
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Product pages">
    <BaseButton
      v-for="page in visiblePages"
      :key="page"
      button-type="button"
      :aria-label="`Page ${page}`"
      :aria-current="page === currentPage ? 'page' : undefined"
      :class="{ active: page === currentPage }"
      @click="page !== currentPage && emit('changePage', page)"
    >
      {{ page }}
    </BaseButton>
    <BaseButton
      v-if="currentPage < totalPages"
      button-type="button"
      aria-label="Next page"
      class="pagination__next"
      @click="emit('changePage', currentPage + 1)"
    >
      <NextIcon class="pagination__next-icon" viewBox="0 0 6.36243 11.2447" aria-hidden="true" />
    </BaseButton>
  </nav>
</template>
<style lang="scss" scoped>
  .pagination {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-top: 86px;

    @media (width < $breakpoints-m) {
      margin-top: 32px;
    }
  }

  .pagination button {
    width: 45px;
    height: 45px;
    font-family: $font-main;
    font-size: 14px;
    line-height: 22px;
    color: $color-black;
    background: $color-white;
    border: 1px solid $color-gray;
    border-radius: 4px;

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 3px;
    }
  }

  .pagination button.active {
    color: $color-white;
    background: $color-black;
  }

  .pagination__next {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pagination__next-icon {
    display: block;
    width: 6.362px;
    height: 11.245px;
  }
</style>
