import { describe, expect, it } from 'vitest'

import { isValidTimeZone, zonedLocalDateTimeToIso } from './site-timezone'

describe('site timezone', () => {
  it('converts a site wall-clock time to an absolute UTC instant', () => {
    expect(zonedLocalDateTimeToIso('2026-08-01T09:30', 'Asia/Shanghai')).toBe(
      '2026-08-01T01:30:00.000Z',
    )
    expect(zonedLocalDateTimeToIso('2026-08-01T09:30', 'UTC')).toBe(
      '2026-08-01T09:30:00.000Z',
    )
  })

  it('rejects invalid timezones and nonexistent DST wall-clock times', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(() =>
      zonedLocalDateTimeToIso('2026-03-08T02:30', 'America/New_York'),
    ).toThrow('不存在')
  })
})
