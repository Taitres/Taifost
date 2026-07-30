'use client'

import { API_URL } from '~/constants/env'

export interface StudioEnvelope<T> {
  data: T
  meta?: {
    pagination?: {
      page?: number
      size?: number
      total?: number
      total_pages?: number
    }
  }
}

export class StudioApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'StudioApiError'
  }
}

const apiUrl = (path: string) =>
  `${API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`

let bearerToken: string | undefined

export const studioFetch = (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers)
  if (bearerToken && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${bearerToken}`)
  }
  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  })
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as
    | StudioEnvelope<T>
    | { error?: { code?: string; message?: string } }
    | T
    | null
  if (!response.ok) {
    const error =
      body && typeof body === 'object' && 'error' in body ? body.error : null
    throw new StudioApiError(
      error?.message || `请求失败（HTTP ${response.status}）`,
      response.status,
      error?.code,
    )
  }
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as StudioEnvelope<T>).data
  }
  return body as T
}

export const studioRequest = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return studioFetch(path, {
    ...init,
    headers,
  }).then(parseResponse<T>)
}

export const studioLogin = async (username: string, password: string) => {
  const result = await studioRequest<{
    user: { role?: string; name?: string }
    token?: string
  }>('/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  bearerToken = result.token
  return result
}

export const studioLogout = async () => {
  try {
    return await studioRequest('/auth/sign-out', { method: 'POST' })
  } finally {
    bearerToken = undefined
  }
}

export const studioCheckAuth = async () => {
  try {
    const result = await studioRequest<{ ok?: boolean }>('/owner/check_logged')
    return Boolean(result?.ok)
  } catch {
    return false
  }
}

export const studioJson = (value: unknown) => JSON.stringify(value)
