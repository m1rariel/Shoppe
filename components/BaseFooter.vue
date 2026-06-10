<script setup lang="ts">
  import ArrowIcon from '@/assets/icons/arrow-icon.svg'
  import FCIcon from '@/assets/icons/fc-icon.svg'
  import InstIcon from '@/assets/icons/inst-icon.svg'
  import TWIcon from '@/assets/icons/twitter-icon.svg'
  import { onMounted, ref } from 'vue'
  import { useState } from '#app'

  const email = ref('')
  const emailStorageKey = 'shoppe:newsletter-email'
  const isEmailSaved = useState('isEmailSaved', () => false)

  onMounted(() => {
    email.value = localStorage.getItem(emailStorageKey) || ''
  })

  const handleSubscribe = () => {
    const normalizedEmail = email.value.trim()

    if (!normalizedEmail) {
      return
    }

    localStorage.setItem(emailStorageKey, normalizedEmail)
    isEmailSaved.value = true
  }
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
          <button class="base-footer__button" type="submit">
            <ArrowIcon />
          </button>
        </form>
      </div>
    </div>
    <div class="base-footer__bottom">
      <p class="base-footer__copyright">
        <span class="base-footer__accent"> © 2021 Shelly. </span>
        Terms of use
        <span class="base-footer__accent"> and </span> privacy policy
      </p>
      <div class="base-footer__socials">
        <a href="#" class="base-footer__social-link"><FCIcon /></a>
        <a href="#" class="base-footer__social-link"><InstIcon /></a>
        <a href="#" class="base-footer__social-link"><TWIcon /></a>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
  .base-footer {
    margin-top: 250px;
    margin-bottom: 100px;
  }

  .base-footer__content {
    display: flex;
    justify-content: space-between;
    padding: 48px 0;
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
  }

  .base-footer__copyright {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-dark-gray;
  }

  .base-footer__accent {
    color: $color-black;
  }

  .base-footer__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
  }

  .base-footer__socials {
    display: flex;
    gap: 30px;
  }

  .base-footer__button:hover {
    cursor: pointer;
    transform: translateX(25%);
    transition: transform 0.3s ease-in-out;
  }
</style>
