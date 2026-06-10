<script setup lang="ts">
  import { computed } from 'vue'

  const modelValue = defineModel<string | number>()
  const isVariableEmail = computed(() => {
    return typeof modelValue.value === `string` && modelValue.value.includes(`@`)
  })
  const hasEmailError = computed(() => {
    return modelValue.value && !isVariableEmail.value
  })
</script>

<template>
  <div class="base-input">
    <input v-model="modelValue" class="base-input__field" />
    <span v-if="hasEmailError" class="base-input__error"> Email isn't valid</span>
  </div>
</template>

<style lang="scss" scoped>
  .base-input__field {
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
</style>
