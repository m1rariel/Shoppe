<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import FacebookIcon from '~/assets/icons/fc-icon.svg'
  import InstagramIcon from '~/assets/icons/inst-icon.svg'
  import TwitterIcon from '~/assets/icons/twitter-icon.svg'
  import MailIcon from '~/assets/icons/mail-icon.svg'
  import { useNotification, NotificationTypes } from '~/composables/useNotification'

  const props = defineProps<{
    product: { id: number; title: string }
    productUrl: string
  }>()

  const { showNotification } = useNotification()

  const isManualLinkVisible = ref(false)
  const manualLinkInput = ref<HTMLInputElement | null>(null)
  const sharingMessage = ref('')
  let shareVersion = 0
  const resetSharing = () => {
    shareVersion++
    isManualLinkVisible.value = false
    sharingMessage.value = ''
  }
  watch(() => [props.product.id, props.product.title, props.productUrl], resetSharing, {
    flush: 'sync',
  })
  onBeforeUnmount(resetSharing)

  const sharingLinks = computed(() => {
    const title = encodeURIComponent(props.product.title)
    const url = encodeURIComponent(props.productUrl)
    return [
      {
        label: 'Share product by email',
        href: `mailto:?subject=${title}&body=${title}%0A${url}`,
        icon: MailIcon,
      },
      {
        label: 'Share product on Facebook',
        href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        icon: FacebookIcon,
      },
      { label: 'Copy product link for Instagram', href: '', icon: InstagramIcon },
      {
        label: 'Share product on Twitter',
        href: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
        icon: TwitterIcon,
      },
    ]
  })

  const showManualLink = async (version: number, message: string) => {
    if (version !== shareVersion) return
    sharingMessage.value = message
    isManualLinkVisible.value = true
    await nextTick()
    if (version !== shareVersion) return
    manualLinkInput.value?.focus()
    manualLinkInput.value?.select()
  }

  const copyProductLink = async () => {
    resetSharing()
    const version = shareVersion
    const url = props.productUrl
    try {
      await navigator.clipboard.writeText(url)
      if (version === shareVersion)
        showNotification({ message: 'Ссылка скопирована', type: NotificationTypes.SUCCESS })
    } catch {
      await showManualLink(
        version,
        'Copying is unavailable. Select and copy the product link below.',
      )
    }
  }

  const shareProduct = async () => {
    resetSharing()
    const version = shareVersion
    try {
      const share = navigator.share
      if (typeof share !== 'function') {
        await copyProductLink()
        return
      }
      await share.call(navigator, { title: props.product.title, url: props.productUrl })
    } catch (error) {
      if (version !== shareVersion) return
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
        return
      showNotification({ message: 'Не удалось поделиться ссылкой', type: NotificationTypes.ERROR })
      await showManualLink(
        version,
        'Sharing is unavailable. Select and copy the product link below.',
      )
    }
  }
</script>

<template>
  <slot :share-product="shareProduct" />
  <div v-if="isManualLinkVisible" class="product-info__manual-link">
    <p role="status">{{ sharingMessage }}</p>
    <label>
      Product link
      <input
        ref="manualLinkInput"
        :value="productUrl"
        type="text"
        readonly
        @focus="manualLinkInput?.select()"
      />
    </label>
  </div>

  <div class="product-info__soc1als" aria-label="Социальные сети">
    <template v-for="link in sharingLinks" :key="link.label">
      <a
        v-if="link.href"
        :href="link.href"
        :target="link.href.startsWith('mailto:') ? undefined : '_blank'"
        rel="noopener noreferrer"
        :aria-label="link.label"
        @click="resetSharing"
        ><component :is="link.icon" aria-hidden="true"
      /></a>
      <button v-else type="button" :aria-label="link.label" @click="copyProductLink">
        <component :is="link.icon" aria-hidden="true" />
      </button>
    </template>
  </div>
</template>

<style lang="scss" scoped>
  .product-info__soc1als {
    display: flex;
    gap: 24px;
    align-items: center;
    margin-top: 80px;
    color: $color-dark-gray;

    @media (width < $breakpoints-m) {
      display: none;
    }
  }

  .product-info__soc1als a,
  .product-info__soc1als button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 24px;
  }

  .product-info__manual-link {
    margin-top: 16px;
    overflow-wrap: anywhere;

    @media (width < $breakpoints-m) {
      order: 2;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .product-info__manual-link input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 8px;
    margin-top: 4px;
    font: inherit;
    font-size: 16px;
    border: 1px solid $color-dark-gray;
    border-radius: 4px;
  }

  .product-info__soc1als svg {
    max-width: 20px;
    height: 20px;
  }
</style>
