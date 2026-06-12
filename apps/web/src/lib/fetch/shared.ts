import {
  allControllers,
  createLegacyApiClient,
  type IRequestAdapter,
} from '@mx-space/api-client/legacy'
import type { $fetch } from 'ofetch'

import { API_URL } from '~/constants/env'

type FetchType = typeof $fetch

interface AdapterOptions {
  params?: Record<string, any> | URLSearchParams
  data?: Record<string, any>
  [key: string]: any
}

export const createFetchAdapter = (
  $fetch: FetchType,
): IRequestAdapter<typeof $fetch> => ({
  default: $fetch,
  get(url: string, options: AdapterOptions) {
    const { params } = options || {}
    return $fetch(url, {
      method: 'GET',
      query: params,
    })
  },
  post(url: string, options: AdapterOptions) {
    const { params, data } = options || {}
    return $fetch(url, {
      method: 'post',
      query: params,
      body: data,
    })
  },
  put(url: string, options: AdapterOptions) {
    const { params, data } = options || {}
    return $fetch(url, {
      method: 'put',
      query: params,
      body: data,
    })
  },
  patch(url: string, options: AdapterOptions) {
    const { params, data } = options || {}
    return $fetch(url, {
      method: 'patch',
      query: params,
      body: data,
    })
  },
  delete(url: string, options: AdapterOptions) {
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
 * install the shared `legacyResponseAdapter` (from `@mx-space/api-client/legacy`)
 * which performs the V2↔V3 shape translation in one place. The adapter
 * unwraps the v3 envelope, flattens `meta.translation` / `meta.interaction`
 * / `meta.insights` into each item, remaps pagination fields, and rewrites
 * legacy `sortBy` aliases.
 */
export const createApiClient = (
  fetchAdapter: ReturnType<typeof createFetchAdapter>,
) =>
  createLegacyApiClient(fetchAdapter)(API_URL, {
    controllers: allControllers,
  })
