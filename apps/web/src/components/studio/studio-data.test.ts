import { describe, expect, it } from 'vitest'

import { StudioApiError } from '~/lib/studio-api'

import { emptyStudioData, loadStudioSnapshot } from './studio-data'

const responses: Record<string, unknown> = {
  '/marlin/materials?page=1&size=100': [],
  '/marlin/materials/media': [],
  '/marlin/projects?page=1&size=100': [
    { id: 'project-1', title: '可继续显示的项目' },
  ],
  '/marlin/hotspots/themes': [],
  '/marlin/hotspots/sources': [],
  '/marlin/hotspots/candidates?page=1&size=100': [],
  '/marlin/ai/roles': [],
  '/categories?page=1&size=100': [],
  '/snippets/by-path?path=theme%2Fshiro': {
    raw: JSON.stringify({
      config: { presentation: { timezone: 'Asia/Shanghai' } },
    }),
  },
}

describe('loadStudioSnapshot', () => {
  it('keeps successful modules visible when one Core module fails', async () => {
    const result = await loadStudioSnapshot(async (path) => {
      if (path === '/marlin/hotspots/sources') {
        throw new Error('source unavailable')
      }
      return responses[path]
    }, emptyStudioData)

    expect(result.data.projects).toEqual([
      { id: 'project-1', title: '可继续显示的项目' },
    ])
    expect(result.data.siteTimezone).toBe('Asia/Shanghai')
    expect(result.failures).toEqual([
      expect.objectContaining({
        key: 'sources',
        label: '热点来源',
        message: 'source unavailable',
      }),
    ])
  })

  it('preserves the previous value for a failed module', async () => {
    const previous = {
      ...emptyStudioData,
      themes: [
        {
          id: 'theme-old',
          name: '保留的主题',
          keywords: [],
          daily_quota: 1,
          enabled: true,
        },
      ],
    }

    const result = await loadStudioSnapshot(async (path) => {
      if (path === '/marlin/hotspots/themes') {
        throw new Error('theme unavailable')
      }
      return responses[path]
    }, previous)

    expect(result.data.themes).toEqual(previous.themes)
    expect(result.failures.map(({ key }) => key)).toEqual(['themes'])
  })

  it('surfaces an expired owner session instead of treating it as partial data', async () => {
    await expect(
      loadStudioSnapshot(async (path) => {
        if (path === '/marlin/projects?page=1&size=100') {
          throw new StudioApiError('登录已过期', 401)
        }
        return responses[path]
      }, emptyStudioData),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('preserves projects when Core returns a malformed successful response', async () => {
    const previous = {
      ...emptyStudioData,
      projects: [
        {
          id: 'project-old',
          title: '保留的项目',
          goal: '',
          status: 'draft',
          created_at: '2026-07-31T00:00:00.000Z',
        },
      ],
    }

    const result = await loadStudioSnapshot(async (path) => {
      if (path === '/marlin/projects?page=1&size=100') {
        return { unexpected: true }
      }
      return responses[path]
    }, previous)

    expect(result.data.projects).toEqual(previous.projects)
    expect(result.failures).toEqual([
      expect.objectContaining({
        key: 'projects',
        message: 'Core 返回了无效的列表数据',
      }),
    ])
  })
})
