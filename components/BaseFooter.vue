<script setup lang="ts">
  import ArrowIcon from '@/assets/icons/arrow-icon.svg'
  import FCIcon from '@/assets/icons/fc-icon.svg'
  import InstIcon from '@/assets/icons/inst-icon.svg'
  import TWIcon from '@/assets/icons/twitter-icon.svg'
  import { onMounted, ref } from 'vue'
  import { NotificationTypes, useNotification } from '#imports'
  import { computed } from 'vue'

  const email = ref('')
  const EMAIL_STORAGE_KEY = 'shoppe:newsletter-email'
  const { showNotification } = useNotification()
  let isSubmitAttempt = ref(false)

  const isVariableEmail = computed(() => {
    return typeof email.value === `string` && email.value.includes(`@`)
  })

  const hasEmailError = computed(() => {
    return isSubmitAttempt.value && !isVariableEmail.value
  })

  const handleSubscribe = () => {
    const normalizedEmail = email.value.trim()
    isSubmitAttempt.value = true

    if (!normalizedEmail || !isVariableEmail.value) {
      showNotification({
        message: 'Email isnt valid',
        type: NotificationTypes.ERROR,
      })
      return
    }

    localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail)

    showNotification({ message: 'Email saved', type: NotificationTypes.SUCCESS })
  }

  onMounted(() => {
    email.value = localStorage.getItem(EMAIL_STORAGE_KEY) || ''
  })
</script>

<template>
  <div class="base-footer container">
    <div class="base-footer__content">
      <nav class="base-footer__left">
        <a href="#" class="base-footer__link">CONTACT</a>
        <a href="#" class="base-footer__link">TERMS OF SERVICES</a>
        <a href="#" class="base-footer__link">SHIPPING AND RETURNS </a>
      </nav>
      <div class="base-footer__right">
        <form class="base-footer__subscribe" @submit.prevent="handleSubscribe">
          <BaseInput
            v-model="email"
            type="email"
            class="base-footer__input"
            placeholder="Give an email, get the newsletter."
            autocomplete="email"
            :error="hasEmailError"
            error-message="Email isnt valid"
          />

          <BaseButton class="base-footer__button" variant="transparent" type="submit">
            <ArrowIcon />
          </BaseButton>
        </form>
        <div class="base-footer__agree">
          <p class="base-footer__agree-title base-footer__mobile">
            i agree to the website’s terms and conditions
          </p>
        </div>
      </div>
    </div>
    <div class="base-footer__bottom">
      <p class="base-footer__copyright">
        <span class="base-footer__accent"> © 2021 Shelly. </span>
        Terms of use
        <span class="base-footer__accent"> and </span> privacy policy
      </p>
      <div class="base-footer__soc1als">
        <h2 class="base-footer__soc1als-title">Follow us</h2>
        <span class="base-footer__soc1ials__divider"></span>
        <a href="#" class="base-footer__soc1al-link"><FCIcon /></a>
        <a href="#" class="base-footer__soc1al-link"><InstIcon /></a>
        <a href="#" class="base-footer__soc1al-link"><TWIcon /></a>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
  .base-footer__soc1als-title {
    margin: 0;
    font-family: $font-main;
    font-size: 12px;
    font-weight: $font-weight-regular;
    line-height: 20px;
    color: $color-black;
  }

  .base-footer__soc1ials__divider {
    width: 47px;
    height: 0;
    border: 1px solid black;
  }

  .base-footer__mobile {
    display: none;
    margin-top: 12px;
    font-family: $font-accent;
    font-size: 12px;
    font-weight: $font-weight-regular;
    line-height: 20px;
    color: $color-black;

    @media (max-width: $breakpoints-s) {
      display: block;
    }
  }

  .base-footer {
    margin-top: 250px;
    margin-bottom: 100px;

    @media (max-width: $breakpoints-s) {
      margin-top: 70px;
    }
  }

  .base-footer__content {
    display: flex;
    justify-content: space-between;
    padding: 48px 0;

    @media (max-width: $breakpoints-s) {
      flex-direction: column-reverse;
    }
  }

  .base-footer__link {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;
    text-decoration: none;
  }

  .base-footer__left {
    display: flex;
    gap: 41px;

    @media (max-width: $breakpoints-s) {
      flex-direction: column-reverse;
      gap: 8px;
      margin-top: 40px;
    }
  }

  .base-footer__copyright {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;

    @media (max-width: $breakpoints-s) {
      margin-top: 36px;
    }
  }

  .base-footer__accent {
    color: $color-black;
  }

  .base-footer__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    @media (max-width: $breakpoints-s) {
      flex-direction: column-reverse;
      align-items: start;
    }
  }

  .base-footer__input {
    min-width: 0;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;
    background-color: transparent;
    border: none;
    field-sizing: content;
  }

  .base-footer__subscribe {
    display: flex;
    gap: 80px;
    align-items: center;
    padding-bottom: 6px;
    border-bottom: 1px solid $color-dark-gray;

    @media (max-width: $breakpoints-s) {
      justify-content: space-between;
    }
  }

  .base-footer__soc1als {
    display: flex;
    gap: 30px;
    align-items: flex-end;

    @media (max-width: $breakpoints-s) {
      gap: 14px;
    }
  }

  .base-footer__button:hover {
    cursor: pointer;
    transform: translateX(25%);
    transition: transform 0.3s ease-in-out;
  }
</style>
