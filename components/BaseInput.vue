<script setup lang="ts">
  defineProps<{
    error?: boolean
    errorMessage?: string
  }>()
  const modelValue = defineModel<string | number>()
</script>

<template>
  <div class="base-input">
    <input
      v-model="modelValue"
      class="base-input__field"
      placeholder="Give an email, get the newsletter."
    />
    <span v-if="error" class="base-input__error"> {{ errorMessage }}</span>
  </div>
</template>

<style lang="scss" scoped>
  .base-input__field {
    width: 100%;
    min-width: 0;
    padding: 0;
    color: currentcolor;
    outline: none;
    background-color: transparent;
    border: none;
  }

  .base-input__field::placeholder {
    color: currentcolor;
    opacity: 0.5;
  }

  .base-input {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .base-input__error {
    color: red;
  }
</style>
