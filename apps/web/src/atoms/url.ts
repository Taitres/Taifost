import { atom } from 'jotai'

import { apiClient } from '~/lib/request'
import { jotaiStore } from '~/lib/store'
import { queryClient } from '~/providers/root/react-query-provider'

export interface UrlConfig {
  adminUrl?: string
  webUrl: string
}

type UrlConfigResponse = UrlConfig | { data: UrlConfig }

export const adminUrlAtom = atom<string | null>(null)
export const webUrlAtom = atom<string | null>(null)

export const fetchAppUrl = async () => {
  const response = await queryClient.fetchQuery({
    queryKey: ['app.url'],
    queryFn: () => apiClient.proxy.options.url.get<UrlConfigResponse>(),
  })
  const data =
    response && 'data' in response
      ? response.data
      : (response as unknown as UrlConfig)

  if (data?.adminUrl) jotaiStore.set(adminUrlAtom, data.adminUrl)
  if (data?.webUrl) jotaiStore.set(webUrlAtom, data.webUrl)
  return data
}

export const getWebUrl = () => jotaiStore.get(webUrlAtom)
export const setWebUrl = (url: string) => jotaiStore.set(webUrlAtom, url)
export const getAdminUrl = () => jotaiStore.get(adminUrlAtom)
