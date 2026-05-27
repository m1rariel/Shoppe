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
  @use '~/assets/styles/variables' as *;
  @use '~/assets/styles/breakpoints' as *;

  .text-block {
    display: flex;
    flex-direction: column;
    gap: 48px;
    align-items: flex-start;
    justify-content: center;
  }

  .text-block__info {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    justify-content: center;
  }

  .text-block__title {
    font-family: $font-main;
    font-size: 33px;
    font-weight: $font-weight-medium;
    line-height: 43px;
    color: $color-white;
  }

  .text-block__cost {
    font-family: $font-main;
    font-size: 26px;
    font-weight: $font-weight-regular;
    line-height: 35px;
    color: $color-white;
  }

  .text-block__button {
    display: block;
    padding: 12px 24px;
    font-family: $font-main;
    font-size: 20px;
    font-weight: $font-weight-bold;
    line-height: 26px;
    color: $color-white;
    cursor: pointer;
    background-color: transparent;
    border: 1px solid $color-white;
    border-radius: 6px;

    &:hover {
      color: $color-black;
      background-color: $color-white;
      transition: all 0.3s ease-in-out;
    }
  }
</style>
