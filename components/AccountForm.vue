<script setup lang="ts">
  defineProps<{
    fields: { name: string; label: string; type: string; autocomplete: string }[]
    values: Record<string, string>
    errors: Record<string, string>
    errorMessage?: string
    loading?: boolean
    buttonLabel: string
  }>()
  defineEmits<{
    update: [name: string, value: string]
    submit: []
  }>()
  const inputs: Record<string, { focus: () => void }> = {}

  const isFocusable = (input: unknown): input is { focus: () => void } =>
    Boolean(
      input && typeof input === 'object' && 'focus' in input && typeof input.focus === 'function',
    )

  const setInput = (name: string, input: unknown) => {
    if (isFocusable(input)) inputs[name] = input
    else delete inputs[name]
  }

  defineExpose({ focus: (name: string) => inputs[name]?.focus() })
</script>

<template>
  <form
    class="account-form"
    novalidate
    :aria-busy="loading || undefined"
    @submit.prevent="$emit('submit')"
  >
    <div v-for="field in fields" :key="field.name" class="account-form__field">
      <label :for="`account-${field.name}`">{{ field.label }}</label>
      <BaseInput
        :id="`account-${field.name}`"
        :ref="(input) => setInput(field.name, input)"
        :model-value="values[field.name]"
        :name="field.name"
        :type="field.type"
        :autocomplete="field.autocomplete"
        :error="Boolean(errors[field.name])"
        :error-message="errors[field.name]"
        :error-id="`account-${field.name}-error`"
        :aria-describedby="errors[field.name] ? `account-${field.name}-error` : undefined"
        @update:model-value="$emit('update', field.name, String($event ?? ''))"
      />
    </div>
    <p v-if="errorMessage" class="account-form__error" role="alert">{{ errorMessage }}</p>
    <BaseButton class="account-form__submit" button-type="submit" :disabled="loading">
      <span v-if="loading" class="account-form__spinner" aria-hidden="true"></span>
      {{ loading ? 'Signing in…' : buttonLabel }}
    </BaseButton>
    <slot></slot>
  </form>
</template>

<style lang="scss" scoped>
  .account-form {
    display: flex;
    flex-direction: column;
    gap: 32px;
    text-align: left;
  }

  .account-form__field {
    display: flex;
    flex-direction: column;
    gap: 10px;

    :deep(.base-input__field) {
      padding: 10px 0;
      font-size: 16px;
      line-height: 27px;
      border-bottom: 1px solid $color-gray;

      &:focus-visible {
        border-color: $color-black;
      }
    }

    :deep(.base-input__error) {
      font-size: 14px;
      line-height: 22px;
      color: $color-errors;
    }
  }

  .account-form__error {
    font-size: 14px;
    line-height: 22px;
    color: $color-errors;
  }

  .account-form__submit {
    gap: 12px;
    min-height: 32px;
    padding: 4px 16px;
    font-weight: $font-weight-bold;
    color: $color-white;
    background-color: $color-black;
    border: 1px solid $color-black;
    border-radius: 4px;

    @media (min-width: $breakpoints-m) {
      min-height: 53px;
      padding: 12px 20px;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.7;
    }
  }

  .account-form__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentcolor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: account-spin 0.8s linear infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  @keyframes account-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
