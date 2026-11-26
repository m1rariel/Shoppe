<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
  import { definePageMeta, navigateTo, useRoute } from '#imports'
  import { useAuthStore } from '~/stores/auth'

  definePageMeta({ middleware: 'guest' })

  const route = useRoute()
  const authStore = useAuthStore()
  const activeTab = ref('sign-in')
  const rememberMe = ref(false)
  const fields = [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      autocomplete: 'username',
      clearable: true,
    },
    { name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' },
  ]
  const values = reactive<Record<string, string>>({ username: '', password: '' })
  const errors = ref<Record<string, string>>({})
  const errorMessage = ref('')
  const loginController = shallowRef<AbortController>()
  const loading = computed(() => Boolean(loginController.value))
  const form = ref<{ focus: (name: string) => void } | null>(null)

  const cancelLogin = () => {
    loginController.value?.abort()
    loginController.value = undefined
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
    loginController.value = controller

    try {
      const success = await authStore.login(
        values.username.trim(),
        values.password,
        controller.signal,
        rememberMe.value,
      )
      if (success && loginController.value === controller) {
        const destination = route.query.returnTo === '/checkout' ? '/checkout' : '/'
        await navigateTo(destination)
      }
    } catch (error: unknown) {
      if (loginController.value !== controller) return

      const loginError = error as { statusCode?: number; status?: number }
      const status = loginError.statusCode ?? loginError.status

      errorMessage.value =
        status === 400 || status === 401 || status === 403
          ? 'Incorrect username or password. Please try again.'
          : 'Unable to sign in. Please try again.'
    } finally {
      if (loginController.value === controller) {
        loginController.value = undefined
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
      <template #actions>
        <label class="account-remember">
          <input v-model="rememberMe" type="checkbox" name="remember-me" />
          <span>Remember me</span>
        </label>
      </template>
      <NuxtLink to="/reset-password" class="account-reset-link"
        >Have you forgotten your password?</NuxtLink
      >
    </AccountForm>
    <p v-else>Registration is currently unavailable.</p>
  </AccountPanel>
</template>

<style lang="scss" scoped>
  .account-remember {
    display: flex;
    gap: 4px;
    align-items: center;
    width: fit-content;
    min-height: 20px;
    cursor: pointer;

    @media (min-width: $breakpoints-m) {
      gap: 8px;
      min-height: 27px;
    }

    input {
      width: 13px;
      height: 13px;
      margin: 0;
      color: $color-white;
      appearance: none;
      cursor: pointer;
      background-color: $color-white;
      border: 1px solid $color-dark-gray;
      border-radius: 2px;

      @media (min-width: $breakpoints-m) {
        width: 16px;
        height: 16px;
      }

      &:checked {
        background-color: $color-black;
        border-color: $color-black;
      }

      &:checked::after {
        display: block;
        width: 4px;
        height: 7px;
        margin: 0 auto;
        content: '';
        border: solid currentcolor;
        border-width: 0 1px 1px 0;
        transform: rotate(45deg);

        @media (min-width: $breakpoints-m) {
          margin-top: 1px;
        }
      }

      &:focus-visible {
        outline: 2px solid $color-black;
        outline-offset: 3px;
      }
    }
  }

  .account-reset-link {
    text-align: center;
  }
</style>
