import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  routeRules: {
    '/checkout': { ssr: false },
  },

  nitro: {
    compressPublicAssets: { gzip: true, brotli: true },
  },

  vite: {
    plugins: [svgLoader()],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @use "~/assets/styles/variables" as *;
            @use "~/assets/styles/breakpoints" as *;
          `,
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: '',
    },
  },

  css: [
    'normalize.css',
    '~/assets/styles/fonts.scss',
    '~/assets/styles/reset.scss',
    '~/assets/styles/basic.scss',
  ],

  app: {
    head: {
      title: 'Shoppe',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'charset', content: 'UTF-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        {
          name: 'description',
          content:
            'Discover jewelry and accessories at Shoppe. Explore the collection and find your next favorite piece.',
        },
      ],
    },
  },

  modules: ['@pinia/nuxt'],
})
