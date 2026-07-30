import {
  allControllers,
  createClient,
  type IRequestAdapter,
} from '@mx-space/api-client'
import { allControllers as v3Controllers } from '@mx-space/api-client-v3'
import { createLegacyApiClient } from '@mx-space/api-client-v3/legacy'
import type { $fetch } from 'ofetch'

import { API_URL } from '~/constants/env'

type FetchType = typeof $fetch

interface RequestOptions {
  method?: string
  data?: Record<string, any>
  params?: Record<string, any> | URLSearchParams
  headers?: Record<string, string>
  transformResponse?: false | (<T = any>(data: any) => T)
  next?: any
  cache?:
    | 'default'
    | 'force-cache'
    | 'no-cache'
    | 'no-store'
    | 'only-if-cached'
    | 'reload'
  [key: string]: any
}

type GetDeleteOptions = Omit<RequestOptions, 'data'>
type WriteOptions = Partial<RequestOptions>

export const createFetchAdapter = (
  $fetch: FetchType,
): IRequestAdapter<typeof $fetch> => ({
  default: $fetch,
  get(url: string, options?: GetDeleteOptions) {
    const { params, ...fetchOptions } = options || {}
    return $fetch(url, {
      ...fetchOptions,
      method: 'GET',
      query: params,
    })
  },
  post(url: string, options?: WriteOptions) {
    const { params, data, ...fetchOptions } = options || {}
    return $fetch(url, {
      ...fetchOptions,
      method: 'post',
      query: params,
      body: data,
    })
  },
  put(url: string, options?: WriteOptions) {
    const { params, data, ...fetchOptions } = options || {}
    return $fetch(url, {
      ...fetchOptions,
      method: 'put',
      query: params,
      body: data,
    })
  },
  patch(url: string, options?: WriteOptions) {
    const { params, data, ...fetchOptions } = options || {}
    return $fetch(url, {
      ...fetchOptions,
      method: 'patch',
      query: params,
      body: data,
    })
  },
  delete(url: string, options?: GetDeleteOptions) {
    const { params, data, ...fetchOptions } = options || {}
    return $fetch(url, {
      ...fetchOptions,
      method: 'delete',
      query: params,
      body: data,
    })
  },
})

const FIELD_ALIASES: Record<string, string> = {
  createdAt: 'created',
  modifiedAt: 'modified',
}

const applyLegacyFieldAliases = (value: any): any => {
  if (Array.isArray(value)) return value.map(applyLegacyFieldAliases)
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [key, nested] of Object.entries(value)) {
      out[FIELD_ALIASES[key] ?? key] = applyLegacyFieldAliases(nested)
    }
    return out
  }
  return value
}

/**
 * Build a v3-aware API client that speaks the v1/v2 host-app contract.
 *
 * The backend is now on `/api/v3` (see `apps/web/src/constants/env.ts`); every
 * controller returns the v3 envelope `{ data, meta? }` and v3 error shape
 * `{ error: { code, message, details? } }`. The rest of the web app was
 * written against the v1/v2 contract:
 *
 *   - list responses used to arrive as `{ data: T[], pagination }` (with
 *     `currentPage` / `totalPage`), and per-item `isLiked`, `likeCount`,
 *     `sourceLang`, `isTranslated`, …  used to be inlined on the model.
 *   - the `sortBy` query param accepted the legacy `created` / `modified`
 *     aliases.
 *
 * Rather than rewriting every query / loader / server-render helper, use the
 * compatibility adapter maintained alongside Core v3. It handles endpoint
 * specific shapes (timeline, note detail/middle lists, comments, activity)
 * in addition to generic envelopes, pagination aliases and metadata fields.
 */

const _createTypedApiClient = (
  fetchAdapter: ReturnType<typeof createFetchAdapter>,
) =>
  createClient(fetchAdapter)(API_URL, {
    controllers: allControllers,
  })

export const createApiClient = (
  fetchAdapter: ReturnType<typeof createFetchAdapter>,
) =>
  createLegacyApiClient(fetchAdapter as any)(API_URL, {
    controllers: v3Controllers,
    responseAdapter: {
      transformData: applyLegacyFieldAliases,
    },
  }) as unknown as ReturnType<typeof _createTypedApiClient>
