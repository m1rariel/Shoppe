<script setup lang="ts">
  import aboutDesktopImg from '@/assets/images/about-img.png'
  import aboutMobileImg from '@/assets/images/about-img-mobile.png'
</script>
<template>
  <section class="about-section container">
    <div class="about-info">
      <h2 class="about-info__title">About</h2>
      <p class="about-info__subtitle">Who we are and why we do what we do!</p>
      <p class="about-info__text about-info__text--desktop">
        Duis rutrum dictum libero quis rutrum. Etiam sed neque aliquam, sollicitudin ante a, gravida
        arcu. Nam fringilla molestie velit, eget pellentesque risus scelerisque a.
        <span class="about__text-mobile">
          Nam ac urna maximus, tempor magna et, placerat urna. Curabitur eu magna enim. Proin
          placerat tortor lacus, ac sodales lectus placerat quis.</span
        >
      </p>
      <p class="about-info__text about-info__text--mobile">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam placerat, augue a volutpat
        hendrerit, sapien tortor faucibus augue, a maximus elit ex vitae libero. Sed quis mauris
        eget
      </p>
    </div>
    <div class="about__content">
      <h3 class="about__head">Top trends</h3>
      <picture class="about__picture">
        <source media="(width < 768px)" :srcset="aboutMobileImg" />
        <img class="about__img" :src="aboutDesktopImg" alt="About image" />
      </picture>

      <p class="about__text">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam placerat, augue a volutpat
        hendrerit, sapien tortor faucibus augue, a maximus elit ex vitae libero.
        <span class="about__text-mobile"
          >Sed quis mauris eget arcu facilisis consequat sed eu felis.
        </span>
      </p>
    </div>
  </section>
</template>
<style lang="scss" scoped>
  .about__text-mobile {
    display: inline;

    @media (width < $breakpoints-m) {
      display: none;
    }
  }

  .about-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 704px;
    padding: 0 16px;
    margin: 0 auto;
    text-align: center;

    @media (width < $breakpoints-m) {
      max-width: 768px;
      text-align: left;
    }
  }

  .about-info__title {
    margin: 0 auto;
    margin-top: 90px;
    font-family: $font-main;
    font-size: 33px;
    font-weight: $font-weight-medium;
    line-height: 43px;
    color: $color-black;

    @media (width < $breakpoints-m) {
      margin-top: 21px;
      font-size: 20px;
      font-weight: $font-weight-regular;
      line-height: 26px;
    }
  }

  .about-info__subtitle {
    margin-top: 24px;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-regular;
    line-height: 26px;
    color: $color-black;

    @media (width < $breakpoints-m) {
      margin-top: 2px;
      font-size: 14px;
      line-height: 22px;
    }
  }

  .about-info__text {
    margin-top: 46px;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
    text-align: left;

    @media (width < $breakpoints-m) {
      margin-top: 15px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .about-info,
  .about__content {
    width: 100%;
  }

  .about-info__text--desktop {
    @media (width < $breakpoints-m) {
      display: none;
    }
  }

  .about-info__text--mobile {
    display: none;

    @media (width < $breakpoints-m) {
      display: block;
    }
  }

  .about__head {
    margin-top: 39px;
    margin-bottom: 23px;
    font-family: $font-main;
    font-size: 26px;
    font-weight: $font-weight-regular;
    line-height: 35px;
    color: $color-black;
    text-align: left;
    letter-spacing: 0%;

    @media (width < $breakpoints-m) {
      margin-top: 22px;
      margin-bottom: 13px;
      font-size: 16px;
      line-height: 27px;
    }
  }

  .about__img {
    display: block;
    width: 100%;
    height: auto;
    object-position: center;
    border-radius: 8px;

    @media (width < $breakpoints-m) {
      height: 200px;
      object-fit: cover;
      object-position: 32% 50%;
    }
  }

  .about__text {
    margin-top: 48px;
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 27px;
    color: $color-black;
    text-align: left;

    @media (width < $breakpoints-m) {
      margin-top: 16px;
      font-size: 12px;
      line-height: 20px;
    }
  }
</style>
