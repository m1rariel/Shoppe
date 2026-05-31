// https://nuxt.com/docs/api/configuration/nuxt-config
import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [svgLoader()],
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.apiBaseUrl || '',
    },
  },
  css: ['normalize.css', '~/assets/styles/reset.scss', '~/assets/styles/basic.scss'],
  app: {
    baseURL: '/',
    head: {
      title: 'Shoppe',
      meta: [
        { name: 'charset', content: 'UTF-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap',
          crossorigin: '',
        },
      ],
    },
  },
})
