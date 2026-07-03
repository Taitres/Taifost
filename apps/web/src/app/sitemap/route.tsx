import { escapeXml } from '~/lib/helper.server'
import { getQueryClient } from '~/lib/query-client.server'
import { apiClient } from '~/lib/request'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour

export const GET = async () => {
  const queryClient = getQueryClient()

  let dataRaw: any
  try {
    dataRaw = await queryClient.fetchQuery({
      queryKey: ['sitemap-root'],
      queryFn: async () => {
        const path = apiClient.aggregate.proxy.sitemap.toString(true)
        return fetch(path).then((res) => res.json())
      },
    })
  } catch {
    return new Response('Sitemap not available', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  const items = dataRaw?.data ?? dataRaw ?? []

  if (!Array.isArray(items) || items.length === 0) {
    return new Response('No sitemap data available', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  const xml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${items
    .map((item: any) => {
      const loc = escapeXml(String(item.url ?? ''))
      const lastmod = item.published_at
        ? escapeXml(String(item.published_at))
        : ''

      return `<url>
  <loc>${loc}</loc>
${lastmod ? `  <lastmod>${lastmod}</lastmod>` : ''}
  <changefreq>daily</changefreq>
</url>`
    })
    .join('')}
  </urlset>
  `.trim()
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
