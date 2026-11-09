import { onMounted, onUnmounted, ref } from 'vue'

const desktopWidth = 768

export const useIsMobile = () => {
  const isMobile = ref(false)
  const checkIsMobile = () => {
    isMobile.value = window.innerWidth < desktopWidth
  }

  onMounted(() => {
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkIsMobile)
  })

  return isMobile
}
