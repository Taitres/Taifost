import {
  allControllers,
  createClient,
  type IRequestAdapter,
} from '@mx-space/api-client'
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
    const { params } = options || {}
    return $fetch(url, {
      method: 'GET',
      query: params,
    })
  },
  post(url: string, options?: WriteOptions) {
    const { params, data } = options || {}
    return $fetch(url, {
      method: 'post',
      query: params,
      body: data,
    })
  },
  put(url: string, options?: WriteOptions) {
    const { params, data } = options || {}
    return $fetch(url, {
      method: 'put',
      query: params,
      body: data,
    })
  },
  patch(url: string, options?: WriteOptions) {
    const { params, data } = options || {}
    return $fetch(url, {
      method: 'patch',
      query: params,
      body: data,
    })
  },
  delete(url: string, options?: GetDeleteOptions) {
    const { params, data } = options || {}
    return $fetch(url, {
      method: 'delete',
      query: params,
      body: data,
    })
  },
})

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
 * Rather than rewriting every query / loader / server-render helper, we
 * install a `transformResponse` hook that performs the V2↔V3 envelope
 * unwrap + pagination field remap in one place. This mirrors the behavior
 * of `legacyResponseAdapter` from `@mx-space/api-client/legacy`, but does
 * not require the `/legacy` subpath export (which is only available on
 * newer api-client versions).
 */

const remapPagination = (pg: any) => {
  if (!pg || typeof pg !== 'object') return pg
  const currentPage = pg.currentPage ?? pg.page
  const totalPage = pg.totalPage ?? pg.totalPages
  const { total } = pg
  const { size } = pg
  const out: Record<string, unknown> = {
    currentPage,
    totalPage,
    total,
    size,
    hasNextPage:
      pg.hasNextPage ??
      (typeof currentPage === 'number' && typeof totalPage === 'number'
        ? currentPage < totalPage
        : undefined),
    hasPrevPage:
      pg.hasPrevPage ??
      (typeof currentPage === 'number' ? currentPage > 1 : undefined),
  }
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
  return out
}

const isPaginateLike = (
  v: unknown,
): v is { data: unknown[]; pagination?: any } =>
  !!v && typeof v === 'object' && Array.isArray((v as any).data)

const legacyTransformResponse = <T = any>(data: any): T => {
  if (isPaginateLike(data)) {
    return {
      ...data,
      pagination: remapPagination(data.pagination),
    } as T
  }
  return data as T
}

export const createApiClient = (
  fetchAdapter: ReturnType<typeof createFetchAdapter>,
) =>
  createClient(fetchAdapter)(API_URL, {
    controllers: allControllers,
    transformResponse: legacyTransformResponse,
  })
