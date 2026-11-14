import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'

const desktopWidth = 768
const clientIsMobile = ref(false)
const consumers = new Set<Ref<boolean>>()

const checkIsMobile = () => {
  clientIsMobile.value = window.innerWidth < desktopWidth
  consumers.forEach((consumer) => {
    consumer.value = clientIsMobile.value
  })
}

export const useIsMobile = () => {
  const isMobile = ref(false)

  onMounted(() => {
    consumers.add(isMobile)

    if (consumers.size === 1) window.addEventListener('resize', checkIsMobile)

    checkIsMobile()
  })

  onUnmounted(() => {
    consumers.delete(isMobile)

    if (consumers.size === 0) window.removeEventListener('resize', checkIsMobile)
  })

  return isMobile
}
