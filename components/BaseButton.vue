<script setup>
  defineProps({
    type: {
      type: String,
      default: 'transparent',
    },
  })
</script>

<template>
  <button type="button" class="base-button"><slot></slot></button>
</template>
<style scoped>
  .base-button {
    cursor: pointer;
    border: none;
  }
</style>
