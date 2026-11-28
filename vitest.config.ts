import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue(), svgLoader()],
  resolve: {
    alias: {
      '~': root,
      '@': root,
      '#app': fileURLToPath(new URL('./tests/unit/mocks/nuxt-app.ts', import.meta.url)),
      '#imports': fileURLToPath(new URL('./tests/unit/mocks/nuxt-imports.ts', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData:
          '@use "~/assets/styles/variables" as *; @use "~/assets/styles/breakpoints" as *;',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'tests/unit/**/*.spec.ts',
      'layouts/**/__tests__/*.spec.ts',
      'components/**/__tests__/*.spec.ts',
      'pages/**/__tests__/*.spec.ts',
    ],
    setupFiles: ['tests/unit/setup.ts'],
    clearMocks: true,
  },
})
