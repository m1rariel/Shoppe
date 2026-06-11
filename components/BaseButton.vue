<script setup>
  defineProps({
    type: {
      type: String,
      default: 'transparent',
    },
  })
</script>

<template>
  <button type="submit" class="base-button"><slot></slot></button>
</template>
<style scoped>
  .base-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    border: none;
  }
</style>
