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
  <div>
    <BaseHeader />
    <MobileMenu />
    <main>
      <slot />
    </main>
    <BaseFooter />
  </div>
</template>
