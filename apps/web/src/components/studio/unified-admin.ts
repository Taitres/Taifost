export type UnifiedAdminRequest = (
  path: string,
  init?: RequestInit,
) => Promise<unknown>

interface UrlConfig {
  webUrl?: string
  web_url?: string
  adminUrl?: string
  admin_url?: string
}

export type UnifiedAdminEntryResult = {
  status: 'updated' | 'unchanged' | 'skipped'
  adminUrl: string
}

const normalizedOrigin = (value?: string) => {
  if (!value) return ''
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

export const nativeConsoleUrl = (gatewayUrl: string, legacyHash = '') => {
  const gateway = gatewayUrl.replace(/\/+$/, '')
  const hash = /^#\//.test(legacyHash) ? legacyHash : '#/dashboard'
  return `${gateway}/proxy/qaqdmin${hash}`
}

/**
 * Keeps every Core-generated admin link on the single Taifost dashboard.
 * Local development origins are deliberately ignored so they can never
 * overwrite the public configuration.
 */
export async function syncUnifiedAdminEntry(
  request: UnifiedAdminRequest,
  currentOrigin: string,
): Promise<UnifiedAdminEntryResult> {
  const config = (await request('/options/url')) as UrlConfig
  const webOrigin = normalizedOrigin(config.webUrl || config.web_url)
  const currentAdminUrl = config.adminUrl || config.admin_url || ''
  const desiredAdminUrl = `${currentOrigin.replace(/\/+$/, '')}/dashboard`

  if (!webOrigin || normalizedOrigin(currentOrigin) !== webOrigin) {
    return { status: 'skipped', adminUrl: currentAdminUrl }
  }
  if (currentAdminUrl === desiredAdminUrl) {
    return { status: 'unchanged', adminUrl: currentAdminUrl }
  }

  await request('/options/url', {
    method: 'PATCH',
    body: JSON.stringify({ adminUrl: desiredAdminUrl }),
  })
  return { status: 'updated', adminUrl: desiredAdminUrl }
}
