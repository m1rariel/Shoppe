<script setup lang="ts">
  import { nextTick, reactive, ref } from 'vue'
  import { useNotification } from '~/composables/useNotification'

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const { showNotification } = useNotification()
  const fields = [{ name: 'email', label: 'Email', type: 'email', autocomplete: 'email' }]
  const values = reactive<Record<string, string>>({ email: '' })
  const errors = ref<Record<string, string>>({})
  const form = ref<{ focus: (name: string) => void } | null>(null)

  const resetPassword = async () => {
    errors.value = {}
    if (!emailPattern.test(values.email.trim())) {
      errors.value.email = 'Enter a valid email address.'
      await nextTick()
      form.value?.focus('email')
      return
    }

    showNotification({ message: 'Отправили пароль на email' })
  }
</script>

<template>
  <AccountPanel
    class="reset-password"
    title="Have you Forgotten Your Password ?"
    mobile-title="Lost password"
  >
    <p class="reset-password__description">
      If you've forgotten your password, enter your e-mail address and we'll send you an e-mail
    </p>
    <AccountForm
      ref="form"
      class="reset-password__form"
      :fields="fields"
      :values="values"
      :errors="errors"
      button-label="RESET PASSWORD"
      @update="(name, value) => (values[name] = value)"
      @submit="resetPassword"
    >
      <NuxtLink to="/account" class="reset-password__back">Back to Sign In</NuxtLink>
    </AccountForm>
  </AccountPanel>
</template>

<style lang="scss" scoped>
  .reset-password {
    :deep(.account-panel__title) {
      margin-bottom: 16px;

      @media (min-width: $breakpoints-m) {
        width: max-content;
        max-width: calc(100vw - 72px);
        margin-right: 50%;
        margin-bottom: 39px;
        margin-left: 50%;
        transform: translateX(-50%);
      }
    }
  }

  .reset-password__form {
    --account-form-submit-gap: 39px;

    @media (min-width: $breakpoints-m) {
      --account-form-submit-gap: 64px;
    }
  }

  .reset-password__description {
    margin-bottom: 64px;
    text-align: left;

    @media (min-width: $breakpoints-m) {
      margin-bottom: 76px;
      font-size: 20px;
      line-height: 26px;
      text-align: center;
    }
  }

  .reset-password__back {
    text-align: center;
  }
</style>
