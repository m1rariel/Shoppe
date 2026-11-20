<script setup lang="ts">
  import { nextTick } from 'vue'
  import type BaseInput from '~/components/BaseInput.vue'
  import UsernameClearIcon from '~/assets/icons/username-clear-icon.svg'

  defineProps<{
    fields: {
      name: string
      label: string
      type: string
      autocomplete: string
      clearable?: boolean
    }[]
    values: Record<string, string>
    errors: Record<string, string>
    errorMessage?: string
    loading?: boolean
    buttonLabel: string
  }>()

  const emit = defineEmits<{
    update: [name: string, value: string]
    submit: []
  }>()

  type InputInstance = InstanceType<typeof BaseInput>

  const inputs: Record<string, InputInstance | null> = {}

  const clearField = async (name: string) => {
    emit('update', name, '')
    await nextTick()
    inputs[name]?.focus()
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
    <div class="account-form__fields">
      <div
        v-for="field in fields"
        :key="field.name"
        class="account-form__field"
        :class="{ 'account-form__field--clearable': field.clearable }"
      >
        <BaseInput
          :id="`account-${field.name}`"
          :ref="(input) => (inputs[field.name] = input as InputInstance | null)"
          :model-value="values[field.name]"
          :name="field.name"
          :type="field.type"
          :autocomplete="field.autocomplete"
          :placeholder="field.label"
          :aria-label="field.label"
          :error="Boolean(errors[field.name])"
          :error-message="errors[field.name]"
          :error-id="`account-${field.name}-error`"
          :aria-describedby="errors[field.name] ? `account-${field.name}-error` : undefined"
          @update:model-value="$emit('update', field.name, String($event ?? ''))"
        />
        <button
          v-if="field.clearable && values[field.name]"
          type="button"
          class="account-form__clear"
          :aria-label="`Clear ${field.label}`"
          @click="clearField(field.name)"
        >
          <UsernameClearIcon width="12" height="12" aria-hidden="true" />
        </button>
      </div>
    </div>
    <p v-if="errorMessage" class="account-form__error" role="alert">{{ errorMessage }}</p>
    <div
      class="account-form__controls"
      :class="{ 'account-form__controls--with-actions': $slots.actions }"
    >
      <div v-if="$slots.actions" class="account-form__actions"><slot name="actions"></slot></div>
      <BaseButton class="account-form__submit" button-type="submit" :disabled="loading">
        <span v-if="loading" class="account-form__spinner" aria-hidden="true"></span>
        {{ loading ? 'Signing in…' : buttonLabel }}
      </BaseButton>
    </div>
    <div v-if="$slots.default" class="account-form__footer"><slot></slot></div>
  </form>
</template>

<style lang="scss" scoped>
  .account-form {
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .account-form__fields {
    display: flex;
    flex-direction: column;
    gap: 47px;

    @media (min-width: $breakpoints-m) {
      gap: 46px;
    }
  }

  .account-form__field {
    position: relative;
    display: flex;
    flex-direction: column;

    :deep(.base-input__field) {
      height: 25px;
      padding: 0 0 4px;
      font-size: 12px;
      line-height: 20px;
      border-bottom: 1px solid $color-gray;

      @media (min-width: $breakpoints-m) {
        height: 39px;
        padding-bottom: 11px;
        font-size: 16px;
        line-height: 27px;
      }

      &::placeholder {
        color: $color-dark-gray;
        opacity: 1;
      }

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

  .account-form__field--clearable :deep(.base-input__field) {
    @media (width < $breakpoints-m) {
      padding-right: 28px;
    }
  }

  .account-form__clear {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 24px;
    height: 20px;
    padding: 0;
    cursor: pointer;
    background: transparent;
    border: 0;

    @media (min-width: $breakpoints-m) {
      display: none;
    }
  }

  .account-form__controls {
    display: flex;
    flex-direction: column;
    margin-top: var(--account-form-submit-gap, 54px);

    @media (min-width: $breakpoints-m) {
      margin-top: var(--account-form-submit-gap, 111px);
    }

    &--with-actions {
      gap: 12px;
      margin-top: 22px;

      @media (min-width: $breakpoints-m) {
        gap: 69px;
        margin-top: 15px;
      }
    }
  }

  .account-form__footer {
    display: flex;
    flex-direction: column;
    margin-top: 16px;

    @media (min-width: $breakpoints-m) {
      margin-top: 13px;
    }
  }

  .account-form__error {
    margin-top: 47px;
    font-size: 14px;
    line-height: 22px;
    color: $color-errors;

    @media (min-width: $breakpoints-m) {
      margin-top: 46px;
    }
  }

  .account-form__submit {
    gap: 12px;
    min-height: 32px;
    padding: 5px 16px;
    font-size: 12px;
    font-weight: $font-weight-regular;
    line-height: 20px;
    color: $color-white;
    background-color: $color-black;
    border: 1px solid $color-black;
    border-radius: 4px;

    @media (min-width: $breakpoints-m) {
      min-height: 53px;
      padding: 15px 20px;
      font-size: 16px;
      font-weight: $font-weight-bold;
      line-height: 21px;
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
