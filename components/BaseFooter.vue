<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { NotificationTypes, useNotification } from '#imports'
  import ArrowIcon from '@/assets/icons/arrow-icon.svg'
  import ArrowIconMobile from '@/assets/icons/arrow-icon-mobile.svg'
  import FacebookIcon from '@/assets/icons/fc-icon.svg'
  import InstagramIcon from '@/assets/icons/inst-icon.svg'
  import TwitterIcon from '@/assets/icons/twitter-icon.svg'

  const footerLinks = ['CONTACT', 'TERMS OF SERVICES', 'SHIPPING AND RETURNS']
  const socialLinks = [
    {
      label: 'Facebook',
      icon: FacebookIcon,
      className: 'base-footer__facebook',
      viewBox: '0 0 10 18',
    },
    {
      label: 'Instagram',
      icon: InstagramIcon,
      className: 'base-footer__instagram',
      viewBox: '0 0 18 18',
    },
    {
      label: 'Twitter',
      icon: TwitterIcon,
      className: 'base-footer__twitter',
      viewBox: '0 0 20 17',
    },
  ]
  const EMAIL_STORAGE_KEY = 'shoppe:newsletter-email'
  const email = ref('')
  const hasSubmitAttempt = ref(false)
  const hasNativeEmailError = ref(false)
  const { showNotification } = useNotification()
  const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+$/.test(email.value.trim()))
  const hasEmailError = computed(
    () => hasSubmitAttempt.value && (!isValidEmail.value || hasNativeEmailError.value),
  )
  const handleInvalidEmail = () => {
    hasSubmitAttempt.value = true
    hasNativeEmailError.value = true
  }

  const handleSubscribe = async () => {
    hasSubmitAttempt.value = true
    if (!isValidEmail.value) return
    try {
      localStorage.setItem(EMAIL_STORAGE_KEY, email.value.trim())
    } catch {
      await showNotification({
        message: 'Unable to save email. Please try again.',
        type: NotificationTypes.ERROR,
      })
      return
    }
    email.value = ''
    hasSubmitAttempt.value = false
    await showNotification({ message: 'Email saved', type: NotificationTypes.SUCCESS })
  }

  onMounted(async () => {
    try {
      email.value = localStorage.getItem(EMAIL_STORAGE_KEY) || ''
    } catch {
      await showNotification({
        message: 'Unable to restore saved email.',
        type: NotificationTypes.ERROR,
      })
    }
  })
</script>
<template>
  <footer class="base-footer container">
    <div class="base-footer__content">
      <nav class="base-footer__links" aria-label="Footer navigation">
        <a v-for="link in footerLinks" :key="link" href="#" class="base-footer__link">{{ link }}</a>
      </nav>
      <div class="base-footer__newsletter">
        <form class="base-footer__subscribe" @submit.prevent="handleSubscribe">
          <input
            v-model="email"
            type="email"
            class="base-footer__input"
            placeholder="Give an email, get the newsletter."
            autocomplete="email"
            aria-label="Email for newsletter"
            :aria-invalid="hasEmailError"
            :aria-describedby="hasEmailError ? 'footer-email-error' : undefined"
            required
            @invalid="handleInvalidEmail"
            @input="hasNativeEmailError = false"
          />
          <BaseButton
            class="base-footer__button"
            variant="transparent"
            button-type="submit"
            aria-label="Save email"
          >
            <ArrowIcon class="base-footer__icon-desktop" aria-hidden="true" />
            <ArrowIconMobile class="base-footer__icon-mobile" aria-hidden="true" />
          </BaseButton>
        </form>
        <p
          v-if="hasEmailError"
          id="footer-email-error"
          class="base-footer__input-error"
          role="alert"
        >
          Please enter a valid email address.
        </p>
        <label class="base-footer__agree">
          <input type="checkbox" class="base-footer__checkbox" />
          <span>i agree to the website’s terms and conditions</span>
        </label>
      </div>
    </div>
    <div class="base-footer__bottom">
      <p class="base-footer__copyright">
        <span class="base-footer__accent">© 2020 Shelly.</span> Terms of use
        <span class="base-footer__accent">and</span> privacy policy.
      </p>
      <div class="base-footer__socials">
        <span class="base-footer__socials-title">Follow us</span>
        <span class="base-footer__socials-divider" aria-hidden="true"></span>
        <nav class="base-footer__social-links" aria-label="Social media">
          <a
            v-for="link in socialLinks"
            :key="link.label"
            href="#"
            class="base-footer__social-link"
            :aria-label="link.label"
          >
            <component
              :is="link.icon"
              :class="link.className"
              :viewBox="link.viewBox"
              aria-hidden="true"
            />
          </a>
        </nav>
      </div>
    </div>
  </footer>
</template>
<style lang="scss" scoped>
  .base-footer {
    margin-top: 250px;
    margin-bottom: 100px;

    @media (width < $breakpoints-m) {
      margin-top: 80px;
      margin-bottom: 27px;
    }
  }

  .base-footer__content {
    display: flex;
    gap: 40px;
    align-items: flex-end;
    justify-content: space-between;
    padding-top: 40px;
    border-top: 1px solid $color-gray;

    @media (width <= $breakpoints-l) {
      flex-direction: column-reverse;
      align-items: stretch;
    }

    @media (width < $breakpoints-m) {
      padding-top: 0;
      border-top: none;
    }
  }

  .base-footer__links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 41px;

    @media (width < $breakpoints-m) {
      flex-direction: column;
      gap: 8px;
    }
  }

  .base-footer__link {
    font-size: 16px;
    line-height: 27px;
    color: $color-dark-gray;

    @media (width < $breakpoints-m) {
      font-size: 12px;
      line-height: 20px;
    }
  }

  .base-footer__newsletter {
    flex: 0 1 396px;
    min-width: 0;

    @media (width <= $breakpoints-l) {
      flex-basis: auto;
      width: 100%;
    }
  }

  .base-footer__subscribe {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    height: 40px;
    border-bottom: 1px solid $color-black;

    @media (width < $breakpoints-m) {
      height: 26px;
    }
  }

  .base-footer__input {
    flex: 1;
    width: 100%;
    min-width: 0;
    padding: 0;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;
    background: transparent;
    border: none;

    &::placeholder {
      color: $color-dark-gray;
      opacity: 1;
    }

    @media (width < $breakpoints-m) {
      font-size: 12px;
      line-height: 20px;
    }
  }

  .base-footer__button {
    flex: 0 0 32px;
    align-self: stretch;
    justify-content: flex-end;
    color: $color-dark-gray;

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 2px;
    }

    @media (width < $breakpoints-m) {
      flex-basis: 24px;
    }
  }

  .base-footer__icon-desktop {
    display: block;
    width: 25px;
    height: 9px;

    @media (width < $breakpoints-m) {
      display: none;
    }
  }

  .base-footer__icon-mobile {
    display: none;
    width: 15px;
    height: 6px;

    @media (width < $breakpoints-m) {
      display: block;
    }
  }

  .base-footer__input-error {
    margin-top: 6px;
    font-size: 12px;
    line-height: 18px;
    color: $color-errors;
  }

  .base-footer__agree {
    display: none;

    @media (width < $breakpoints-m) {
      display: flex;
      gap: 4px;
      align-items: center;
      margin-top: 10px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .base-footer__checkbox {
    flex: 0 0 13px;
    width: 13px;
    height: 13px;
    margin: 0;
  }

  .base-footer__bottom {
    display: flex;
    gap: 32px;
    align-items: flex-start;
    justify-content: space-between;
    margin-top: 48px;

    @media (width < $breakpoints-m) {
      flex-direction: column-reverse;
      gap: 36px;
      margin-top: 32px;
    }
  }

  .base-footer__copyright {
    min-width: 0;
    font-size: 16px;
    line-height: 27px;
    color: $color-dark-gray;

    @media (width < $breakpoints-m) {
      font-size: 12px;
      line-height: 20px;
    }
  }

  .base-footer__accent {
    color: $color-black;

    @media (width < $breakpoints-m) {
      color: inherit;
    }
  }

  .base-footer__socials {
    display: flex;
    flex: 0 0 auto;
    gap: 16px;
    align-items: baseline;
    padding-top: 1px;
  }

  .base-footer__socials-title {
    display: none;
    flex-shrink: 0;
    font-size: 12px;
    line-height: 20px;
    color: $color-black;
    white-space: nowrap;

    @media (width < $breakpoints-m) {
      display: block;
    }
  }

  .base-footer__socials-divider {
    display: none;
    flex: 0 0 47px;
    height: 1px;
    background: $color-black;

    @media (width < $breakpoints-m) {
      display: block;
    }
  }

  .base-footer__social-links {
    display: flex;
    gap: 30px;
    align-items: center;

    @media (width < $breakpoints-m) {
      gap: 16px;
      margin-left: -8px;
    }
  }

  .base-footer__social-link {
    display: flex;
    align-items: center;

    @media (width < $breakpoints-m) {
      height: 12px;
    }
  }

  .base-footer__facebook {
    display: block;
    width: 10px;
    height: 18px;

    @media (width < $breakpoints-m) {
      width: 6.667px;
      height: 12px;

      :deep(path) {
        fill: $color-black;
      }
    }
  }

  .base-footer__instagram {
    display: block;
    width: 18px;
    height: 18px;

    @media (width < $breakpoints-m) {
      width: 12px;
      height: 12px;
    }
  }

  .base-footer__twitter {
    display: block;
    width: 20px;
    height: 17px;

    @media (width < $breakpoints-m) {
      width: 14.118px;
      height: 12px;
    }
  }
</style>
