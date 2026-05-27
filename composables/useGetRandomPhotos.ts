import { useApiFetch } from '~/composables/api/useApiFetch'
import type { PicsumPhoto } from '~/types/api'

export const useGetRandomPhotos = (limit = 10) => {
  const randomPage = Math.floor(Math.random() * 100)

  return useApiFetch<PicsumPhoto[]>('/v2/list', {
    baseURL: 'https://picsum.photos',
    headers: {},
    params: {
      page: randomPage,
      limit,
    },
  })
}
