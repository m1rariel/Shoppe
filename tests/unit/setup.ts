import { afterEach, vi } from 'vitest'
import { config, enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

config.global.components.NuxtLink = defineComponent({
  props: { to: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  document.body.innerHTML = ''
})
