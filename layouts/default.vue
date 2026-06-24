<script>
  import BaseHeader from '@/components/BaseHeader.vue'
  import MobileMenu from '@/components/MobileMenu.vue'
  import BaseFooter from '@/components/BaseFooter.vue'

  export default {
    components: {
      BaseHeader,
      MobileMenu,
      BaseFooter,
    },
  }
</script>

<template>
  <div>
    <BaseHeader />
    <MobileMenu />
    <main>
      <slot />
    </main>
    <BaseFooter />
  </div>
</template>
