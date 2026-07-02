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
  <div class="pagination">
    <BaseButton
      v-for="page in visiblePages"
      :key="page"
      type="button"
      :class="{ active: page === currentPage }"
      @click="emit('changePage', page)"
    >
      {{ page }}
    </BaseButton>
    <BaseButton
      v-if="currentPage < totalPages"
      type="button"
      class="pagination__next"
      @click="emit('changePage', currentPage + 1)"
    >
      <NextIcon class="pagination__next-icon" aria-hidden="true" />
    </BaseButton>
  </div>
</template>
<style lang="scss" scoped>
  .pagination {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 86px;
  }

  .pagination button {
    width: 40px;
    height: 40px;
    border: 1px solid $color-gray;
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
    width: 16px;
    height: 16px;
  }
</style>
