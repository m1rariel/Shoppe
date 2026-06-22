import { useState } from 'nuxt/app'
import { useApiFetch } from '~/composables/api/useApiFetch'
import type { PicsumPhoto } from '~/types/api'

export const useGetRandomPhotos = (limit = 10) => {
  const randomPage = useState(`random-photos-page-${limit}`, () => Math.floor(Math.random() * 100))

  return useApiFetch<PicsumPhoto[]>('/v2/list', {
    baseURL: 'https://picsum.photos',
    server: false,
    lazy: true,
    headers: {},
    params: {
      page: randomPage.value,
      limit,
    },
  })
}
