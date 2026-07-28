import { env } from 'next-runtime-env'

import { isClientSide, isDev } from '~/lib/env'

const normalizeCoreApiUrl = (value: string) => {
  const base = value.replace(/\/+$/, '')
  if (!base || /\/api\/v\d+$/i.test(base)) return base
  return `${base}/api/v3`
}

export const API_URL: string = (() => {
  const configuredApiUrl =
    process.env.NEXT_PUBLIC_API_URL || env('NEXT_PUBLIC_API_URL') || ''

  if (isDev) return normalizeCoreApiUrl(configuredApiUrl)

  if (isClientSide && env('NEXT_PUBLIC_CLIENT_API_URL')) {
    return normalizeCoreApiUrl(env('NEXT_PUBLIC_CLIENT_API_URL') || '')
  }

  return normalizeCoreApiUrl(configuredApiUrl) || '/api/v3'
})() as string
export const GATEWAY_URL = env('NEXT_PUBLIC_GATEWAY_URL') || ''
