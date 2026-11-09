<script>
  import BaseHeader from '@/components/BaseHeader.vue'
  import MobileMenu from '@/components/MobileMenu.vue'
  import BaseFooter from '@/components/BaseFooter.vue'
  import BaseNotification from '~/components/BaseNotification.vue'

  export default {
    components: {
      BaseHeader,
      MobileMenu,
      BaseFooter,
      BaseNotification,
    },
  }
</script>

<template>
  <div
    :class="{ 'layout--catalog': $route.path === '/products', 'layout--home': $route.path === '/' }"
  >
    <BaseHeader />
    <MobileMenu :hide-search="$route.path.startsWith('/products/')" />
    <main>
      <slot />
    </main>
    <BaseFooter />
  </div>
</template>

<style lang="scss" scoped>
  .layout--home :deep(.base-footer) {
    @media (width < $breakpoints-m) {
      margin-top: 70px;
    }
  }

  .layout--catalog :deep(.base-footer) {
    margin-top: 112px;

    @media (width < $breakpoints-m) {
      margin-top: 70px;
    }
  }
</style>
