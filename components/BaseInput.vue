<script setup lang="ts">
  import { ref, useAttrs } from 'vue'
  import type { InputHTMLAttributes } from 'vue'

  defineOptions({ inheritAttrs: false })
  defineProps<{
    error?: boolean
    errorMessage?: string
    errorId?: string
    placeholder?: string
    disabled?: boolean
  }>()
  const modelValue = defineModel<string | number>()
  const input = ref<HTMLInputElement | null>(null)
  const attrs = useAttrs() as InputHTMLAttributes

  defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="base-input" :class="attrs.class" :style="attrs.style">
    <input
      ref="input"
      v-model="modelValue"
      v-bind="{ ...attrs, class: undefined, style: undefined }"
      :aria-invalid="error || attrs['aria-invalid'] || undefined"
      class="base-input__field"
      :placeholder="placeholder"
      :disabled="disabled"
    />
    <span v-if="error" :id="errorId" class="base-input__error"> {{ errorMessage }}</span>
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
    color: $color-error-red;
  }
</style>
