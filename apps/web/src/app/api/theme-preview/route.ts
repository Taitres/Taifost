import { type NextRequest, NextResponse } from 'next/server'

import { API_URL } from '~/constants/env'
import {
  isMarlinThemeId,
  MARLIN_THEME_PREVIEW_COOKIE,
  MARLIN_THEME_PREVIEW_TOKEN_COOKIE,
} from '~/lib/marlin-theme'

const previewCookieOptions = {
  httpOnly: true,
  maxAge: 30 * 60,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

const isOwnerToken = async (authorization: string) => {
  if (!authorization.startsWith('Bearer ')) return false
  const response = await fetch(`${API_URL}/owner/check_logged`, {
    headers: { authorization },
    cache: 'no-store',
  }).catch(() => null)
  if (!response?.ok) return false
  const body = (await response.json().catch(() => null)) as
    | { data?: { ok?: number | boolean } }
    | { ok?: number | boolean }
    | null
  if (!body) return false
  if ('data' in body) return Boolean(body.data?.ok)
  return Boolean((body as { ok?: number | boolean }).ok)
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const body = (await request.json().catch(() => null)) as {
    theme?: unknown
  } | null

  if (!body || !isMarlinThemeId(body.theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }
  if (!(await isOwnerToken(authorization))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    MARLIN_THEME_PREVIEW_COOKIE,
    body.theme,
    previewCookieOptions,
  )
  response.cookies.set(
    MARLIN_THEME_PREVIEW_TOKEN_COOKIE,
    authorization.slice('Bearer '.length),
    previewCookieOptions,
  )
  return response
}

export function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(MARLIN_THEME_PREVIEW_COOKIE, '', {
    ...previewCookieOptions,
    maxAge: 0,
  })
  response.cookies.set(MARLIN_THEME_PREVIEW_TOKEN_COOKIE, '', {
    ...previewCookieOptions,
    maxAge: 0,
  })
  return response
}
