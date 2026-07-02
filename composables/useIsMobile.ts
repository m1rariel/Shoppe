import { ref } from 'vue'
import { onMounted, onUnmounted } from 'vue'
const mobileWidth = 768
const isMobile = ref(false)
let initialized = false

export const useIsMobile = () => {
  const checkIsMobile = () => {
    isMobile.value = window.innerWidth <= mobileWidth
  }

  onMounted(() => {
    if (initialized) return
    initialized = true

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkIsMobile)
  })

  return isMobile
}
