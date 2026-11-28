import { useState } from 'nuxt/app'
import { useApiFetch } from '~/composables/api/useApiFetch'
import type { PicsumPhoto } from '~/types/api'

const prerenderPage = import.meta.prerender ? Math.floor(Math.random() * 100) : undefined

export const useGetRandomPhotos = (limit = 10) => {
  const randomPage = useState(
    `random-photos-page-${limit}`,
    () => prerenderPage ?? Math.floor(Math.random() * 100),
  )

  return useApiFetch<PicsumPhoto[]>('/v2/list', {
    baseURL: 'https://picsum.photos',
    headers: {},
    timeout: 4000,
    retry: 0,
    params: {
      page: randomPage.value,
      limit,
    },
  })
}
