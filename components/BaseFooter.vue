<script setup lang="ts">
  import ArrowIcon from '@/assets/icons/arrow-icon.svg'
  import FCIcon from '@/assets/icons/fc-icon.svg'
  import InstIcon from '@/assets/icons/inst-icon.svg'
  import TWIcon from '@/assets/icons/twitter-icon.svg'
  import ArrowIconMobile from '@/assets/icons/arrow-icon-mobile.svg'
  import { onMounted, ref } from 'vue'
  import { NotificationTypes, useNotification } from '#imports'
  import { computed } from 'vue'

  const email = ref('')
  const EMAIL_STORAGE_KEY = 'shoppe:newsletter-email'
  const { showNotification } = useNotification()
  const isSubmitAttempt = ref(false)

  const isVariableEmail = computed(() => {
    return typeof email.value === `string` && email.value.includes(`@`)
  })

  const hasEmailError = computed(() => {
    return isSubmitAttempt.value && !isVariableEmail.value
  })

  const handleSubscribe = async () => {
    const normalizedEmail = email.value.trim()
    isSubmitAttempt.value = true

    if (!normalizedEmail || !isVariableEmail.value) {
      await showNotification({
        message: 'Email isnt valid',
        type: NotificationTypes.ERROR,
      })
      return
    }

    localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail)
    email.value = ''
    isSubmitAttempt.value = false

    await showNotification({ message: 'Email saved', type: NotificationTypes.SUCCESS })
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
          />

          <BaseButton class="base-footer__button" variant="transparent" button-type="submit">
            <ArrowIcon class="base-footer__icon-desktop" />
            <ArrowIconMobile class="base-footer__icon-mobile" />
          </BaseButton>
        </form>
        <span v-if="hasEmailError" class="base-footer__input-error">Email isnt valid</span>
        <div class="base-footer__agree">
          <input type="checkbox" class="base-footer__checkbox" />
          <p class="base-footer__agree-title base-footer__mobile">
            i agree to the website’s terms and conditions
          </p>
        </div>
      </div>
    </div>
    <div class="base-footer__bottom">
      <p class="base-footer__copyright">
        <span class="base-footer__accent"> © 2020 Shelly. </span>
        Terms of use
        <span class="base-footer__accent"> and </span> privacy policy.
      </p>
      <div class="base-footer__soc1als">
        <h2 class="base-footer__soc1als-title">Follow us</h2>
        <span class="base-footer__soc1ials__divider"></span>
        <a href="#" class="base-footer__soc1al-link">
          <FCIcon class="base-footer__facebook-icon" />
        </a>
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
    width: 46px;
    height: 0;
    margin-bottom: 5px;
    border: 1px solid black;
  }

  .base-footer__checkbox {
    margin-top: 12px;
    outline: none;

    @media (min-width: $breakpoints-m) {
      display: none;
    }
  }

  .base-footer__icon-mobile {
    display: none;
  }

  @media (max-width: $breakpoints-s) {
    .base-footer__icon-desktop {
      display: none;
    }

    .base-footer__icon-mobile {
      display: block;
    }
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
    border-top: 1px solid $color-light-gray;

    @media (max-width: $breakpoints-l) {
      flex-direction: column-reverse;
      border-top: none;
    }

    @media (max-width: $breakpoints-m) {
      padding-block: 48px 32px;
    }
  }

  .base-footer__agree {
    display: flex;
    gap: 5px;
  }

  .base-footer__content,
  .base-footer__left,
  .base-footer__right,
  .base-footer__agree {
    @media (max-width: $breakpoints-l) {
      width: 100%;
    }
  }

  .base-footer__link {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;
    text-decoration: none;

    @media (max-width: $breakpoints-xl) {
      font-size: 14px;
    }
  }

  .base-footer__left {
    display: flex;
    gap: 41px;

    @media (max-width: $breakpoints-l) {
      flex-wrap: wrap;
      gap: 24px 32px;
      width: 100%;
      margin-top: 40px;
    }

    @media (max-width: $breakpoints-s) {
      flex-direction: column;
      gap: 8px;
    }
  }

  .base-footer__copyright {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;

    @media (max-width: $breakpoints-s) {
      font-size: 12px;
      line-height: 20px;
      white-space: normal;
    }
  }

  .base-footer__accent {
    color: $color-black;

    @media (max-width: $breakpoints-s) {
      color: inherit;
    }
  }

  .base-footer__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    @media (max-width: $breakpoints-l) {
      flex-wrap: wrap;
      gap: 36px;
    }

    @media (max-width: $breakpoints-s) {
      flex-direction: column-reverse;
      align-items: start;
      width: 100%;
    }
  }

  .base-footer__right {
    width: 100%;
    max-width: 396px;

    @media (max-width: $breakpoints-l) {
      max-width: 100%;
    }
  }

  .base-footer__input {
    flex: 1;
    min-width: 0;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;
    background-color: transparent;
    border: none;
  }

  .base-footer__subscribe {
    display: flex;
    gap: 80px;
    align-items: center;
    width: 100%;
    padding-bottom: 12px;
    border-bottom: 1px solid $color-dark-gray;

    @media (max-width: $breakpoints-l) {
      gap: 24px;
      justify-content: space-between;
    }

    @media (max-width: $breakpoints-s) {
      gap: 16px;
      padding-bottom: 6px;
    }
  }

  .base-footer__button {
    flex: 0 0 auto;
  }

  .base-footer__agree-title {
    font-family: $font-main;
    font-size: 12px;
    font-weight: $font-weight-regular;
    line-height: 20px;
  }

  .base-footer__button::before {
    position: absolute;
    padding: 24px;
    content: '';
  }

  .base-footer__input-error {
    display: block;
    margin-top: 6px;
    font-family: $font-main;
    font-size: 12px;
    line-height: 18px;
    color: red;
  }

  .base-footer__soc1als {
    display: flex;
    gap: 30px;
    align-items: flex-end;

    @media (max-width: $breakpoints-l) {
      gap: 24px;
    }

    @media (max-width: $breakpoints-s) {
      gap: 14px;
      width: 100%;
    }
  }

  .base-footer__facebook-icon {
    @media (max-width: $breakpoints-s) {
      :deep(path) {
        fill: $color-black;
      }
    }
  }

  .base-footer__button:hover {
    cursor: pointer;
    transform: translateX(25%);
    transition: transform 0.3s ease-in-out;
  }

  @media (min-width: $breakpoints-l) {
    .base-footer__soc1ials__divider,
    .base-footer__soc1als-title {
      display: none;
    }
  }
</style>
