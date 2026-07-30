export const DEFAULT_SITE_TIMEZONE = 'Asia/Shanghai'

export const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format()
    return true
  } catch {
    return false
  }
}

const partsInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(
    parts
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
}

/**
 * Convert the wall-clock value produced by `<input type="datetime-local">`
 * in the configured site timezone into an absolute UTC instant.
 */
export const zonedLocalDateTimeToIso = (
  value: string,
  timeZone = DEFAULT_SITE_TIMEZONE,
) => {
  if (!isValidTimeZone(timeZone)) {
    throw new Error(`无效的 IANA 时区：${timeZone}`)
  }
  const match =
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2}))?$/.exec(
      value,
    )
  if (!match?.groups) throw new Error('定时发布时间格式无效')

  const desired = {
    year: Number(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
    hour: Number(match.groups.hour),
    minute: Number(match.groups.minute),
    second: Number(match.groups.second ?? 0),
  }
  const desiredAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second,
  )

  let instant = desiredAsUtc
  for (let index = 0; index < 3; index += 1) {
    const actual = partsInTimeZone(new Date(instant), timeZone)
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    )
    instant += desiredAsUtc - actualAsUtc
  }

  const resolved = partsInTimeZone(new Date(instant), timeZone)
  const sameWallTime = Object.entries(desired).every(
    ([key, part]) => resolved[key as keyof typeof resolved] === part,
  )
  if (!sameWallTime) {
    throw new Error(`该时间在 ${timeZone} 中不存在，请避开夏令时切换时刻`)
  }
  return new Date(instant).toISOString()
}
