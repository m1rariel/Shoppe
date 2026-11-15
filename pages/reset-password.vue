<script setup lang="ts">
  import { nextTick, reactive, ref } from 'vue'
  import { useNotification } from '~/composables/useNotification'

  const { showNotification } = useNotification()
  const fields = [{ name: 'email', label: 'Email', type: 'email', autocomplete: 'email' }]
  const values = reactive<Record<string, string>>({ email: '' })
  const errors = ref<Record<string, string>>({})
  const form = ref<{ focus: (name: string) => void } | null>(null)

  const resetPassword = async () => {
    errors.value = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.value.email = 'Enter a valid email address.'
      await nextTick()
      form.value?.focus('email')
      return
    }

    showNotification({ message: 'Отправили пароль на email' })
  }
</script>

<template>
  <AccountPanel title="Have you Forgotten Your Password?" mobile-title="Lost password">
    <p class="reset-password__description">Enter your email address to reset your password.</p>
    <AccountForm
      ref="form"
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
  .reset-password__description {
    margin-bottom: 40px;
    color: $color-dark-gray;
  }

  .reset-password__back {
    text-align: center;
  }
</style>
