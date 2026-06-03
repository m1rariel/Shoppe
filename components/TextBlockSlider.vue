<template>
  <div class="text-block">
    <div class="text-block__info">
      <p class="text-block__title">Gold big hoops</p>
      <p class="text-block__cost">$ &nbsp; 68,00</p>
    </div>
    <button class="text-block__button">View Product</button>
  </div>
</template>
<style lang="scss" scoped>
  .text-block {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    justify-content: center;

    @media (min-width: $breakpoints-m) {
      gap: 48px;
    }
  }

  .text-block__info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
    justify-content: center;

    @media (min-width: $breakpoints-m) {
      gap: 16px;
    }
  }

  .text-block__title {
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-medium;
    line-height: 26px;
    color: $color-white;

    @media (min-width: $breakpoints-m) {
      font-size: 33px;
      line-height: 43px;
    }
  }

  .text-block__cost {
    font-family: $font-main;
    font-size: 16px;
    font-weight: $font-weight-regular;
    line-height: 22px;
    color: $color-white;

    @media (min-width: $breakpoints-m) {
      font-size: 26px;
      line-height: 35px;
    }
  }

  .text-block__button {
    display: block;
    padding: 6px 12px;
    font-family: $font-main;
    font-size: 12px;
    font-weight: $font-weight-bold;
    line-height: 16px;
    color: $color-white;
    cursor: pointer;
    background-color: transparent;
    border: 1px solid $color-white;
    border-radius: 6px;

    @media (min-width: $breakpoints-m) {
      padding: 12px 24px;
      font-size: 20px;
      line-height: 26px;
    }

    &:hover {
      color: $color-black;
      background-color: $color-white;
      transition: all 0.3s ease-in-out;
    }
  }
</style>
