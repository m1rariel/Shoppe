import type { MaybeRefOrGetter } from 'vue'

export const resolveApiBaseURL = <T extends MaybeRefOrGetter<string | undefined> = never>(
  configuredBaseURL: string,
  overrideBaseURL?: T,
) => {
  const baseURL = overrideBaseURL || configuredBaseURL
  if (!baseURL) throw new Error('API_BASE_URL is not set')
  return baseURL
}

export const createApiHeaders = (token: string | null | undefined) => ({
  'Content-Type': 'application/json',
  Authorization: token ? `Bearer ${token}` : 'amigo',
})
