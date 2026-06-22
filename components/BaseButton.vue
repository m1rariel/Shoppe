<script setup lang="ts">
  const { buttonType = 'button' } = defineProps<{
    buttonType?: 'button' | 'submit' | 'reset'
    variant?: 'default' | 'transparent'
  }>()
</script>

<template>
  <button :type="buttonType" class="base-button"><slot></slot></button>
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
