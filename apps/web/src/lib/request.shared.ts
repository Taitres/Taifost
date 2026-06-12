import { RequestError } from '@mx-space/api-client'
import type { FetchError } from 'ofetch'

interface V3ErrorBody {
  error?: {
    code?: string | number
    message?: string | string[]
    details?: unknown
  }
}

/**
 * v3 backend emits `{ error: { code, message, details? } }` on failure.
 * Older call sites still expect the v2 shape (`{ message }` directly on the
 * body or a top-level array of messages) — accept both so legacy error
 * pages keep rendering during the cutover.
 */
const extractBizMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined
  const v3 = (data as V3ErrorBody).error
  if (v3) {
    const m = v3.message
    if (typeof m === 'string') return m
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0]
  }
  // legacy fallback: top-level `message` field
  const legacy = (data as { message?: string | string[] }).message
  if (typeof legacy === 'string') return legacy
  if (Array.isArray(legacy) && typeof legacy[0] === 'string') return legacy[0]
  return undefined
}

export const getErrorMessageFromRequestError = (error: RequestError) => {
  if (!(error instanceof RequestError)) return (error as Error).message
  const fetchError = error.raw as FetchError
  const bizMessage = extractBizMessage(fetchError.response?._data)
  return bizMessage || fetchError.message
}
