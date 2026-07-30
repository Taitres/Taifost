'use client'

import { useEffect, useState } from 'react'

import { CountUp } from '~/components/ui/number-transition'
import {
  dayOfYear,
  daysOfYear,
  secondOfDay,
  secondOfDays,
} from '~/lib/datetime'

const PROGRESS_DURATION = 2
const REFRESH_INTERVAL = 1000
export const TimelineProgress = () => {
  const [percentOfYear, setPercentYear] = useState(0)
  const [percentOfDay, setPercentDay] = useState(0)
  // Stable placeholders prevent the server timezone and browser timezone from
  // producing different markup during hydration.
  const [currentYear, setCurrentYear] = useState(0)
  const [currentDay, setCurrentDay] = useState(0)

  useEffect(() => {
    const updateCurrentDate = () => {
      const year = new Date().getFullYear()
      const day = dayOfYear()
      setCurrentDay(day)
      setCurrentYear(year)
    }
    updateCurrentDate()
    const timer = setInterval(() => {
      updateCurrentDate()
    }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const updatePercent = () => {
      const nowY = (dayOfYear() / daysOfYear(new Date().getFullYear())) * 100
      const nowD = (secondOfDay() / secondOfDays) * 100
      setPercentYear(nowY)
      setPercentDay(nowD)
    }
    updatePercent()
    let timer = setInterval(updatePercent, REFRESH_INTERVAL)
    return () => {
      // @ts-ignore
      timer = clearInterval(timer)
    }
  }, [])
  return (
    <>
      <p>
        <span className="shrink-0">今天是 {currentYear} 年的第</span>
        <CountUp
          to={currentDay}
          className="mx-1"
          decimals={0}
          duration={PROGRESS_DURATION}
        />
        <span className="shrink-0">天</span>
      </p>
      <p>
        今年已过{' '}
        <CountUp to={percentOfYear} decimals={6} duration={PROGRESS_DURATION} />
        %
      </p>
      <p>
        今天已过{' '}
        <CountUp to={percentOfDay} decimals={6} duration={PROGRESS_DURATION} />%
      </p>
    </>
  )
}
