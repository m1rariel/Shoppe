<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
  import { definePageMeta, navigateTo } from '#imports'
  import { useAuthStore } from '~/stores/auth'

  definePageMeta({ middleware: 'guest' })

  const authStore = useAuthStore()
  const activeTab = ref('sign-in')
  const fields = [
    { name: 'username', label: 'Username', type: 'text', autocomplete: 'username' },
    { name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' },
  ]
  const values = reactive<Record<string, string>>({ username: '', password: '' })
  const errors = ref<Record<string, string>>({})
  const errorMessage = ref('')
  const request = shallowRef<AbortController>()
  const loading = computed(() => Boolean(request.value))
  const form = ref<{ focus: (name: string) => void } | null>(null)

  const cancelLogin = () => {
    request.value?.abort()
    request.value = undefined
  }

  watch(activeTab, cancelLogin, { flush: 'sync' })
  onBeforeUnmount(cancelLogin)

  const signIn = async () => {
    if (loading.value || activeTab.value !== 'sign-in') return

    errors.value = {}
    errorMessage.value = ''
    if (!values.username.trim()) errors.value.username = 'Enter your username.'
    if (!values.password.trim()) errors.value.password = 'Enter your password.'

    const firstInvalid = fields.find((field) => errors.value[field.name])
    if (firstInvalid) {
      await nextTick()
      form.value?.focus(firstInvalid.name)
      return
    }

    const controller = new AbortController()
    request.value = controller

    try {
      await authStore.login(values.username.trim(), values.password, controller.signal)
      if (request.value === controller) await navigateTo('/')
    } catch (error: unknown) {
      if (request.value !== controller) return

      const status =
        (error as { statusCode?: number; status?: number }).statusCode ??
        (error as { status?: number }).status
      errorMessage.value =
        status === 400 || status === 401 || status === 403
          ? 'Incorrect username or password. Please try again.'
          : 'Unable to sign in. Please try again.'
    } finally {
      if (request.value === controller) {
        request.value = undefined
      }
    }
  }
</script>

<template>
  <AccountPanel title="My account">
    <AccountTabs v-model="activeTab" />
    <AccountForm
      v-if="activeTab === 'sign-in'"
      ref="form"
      :fields="fields"
      :values="values"
      :errors="errors"
      :error-message="errorMessage"
      :loading="loading"
      button-label="SIGN IN"
      @update="(name, value) => (values[name] = value)"
      @submit="signIn"
    >
      <NuxtLink to="/reset-password" class="account-reset-link"
        >Have you forgotten your password?</NuxtLink
      >
    </AccountForm>
    <p v-else>Registration is currently unavailable.</p>
  </AccountPanel>
</template>

<style lang="scss" scoped>
  .account-reset-link {
    text-align: center;
  }
</style>
