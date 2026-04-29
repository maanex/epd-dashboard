import type { Renderer } from "../../lib/image"
import type { FillStyle } from "../../lib/paint"
import { getDayLength } from "../../lib/sun-position"


export function fillBlack(): Renderer<void> {
  return async ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('black')
  }
}

export function getDayLengthMetrics() {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  const dayLength = getDayLength(dayOfYear)
  const dayChangeToday = Math.floor((dayLength - getDayLength(dayOfYear - 1)) * 60)
  const dayChangeNextWeek = Math.floor((getDayLength(dayOfYear + 7) - dayLength) * 60)
  return {
    dayLength,
    dayChangeToday,
    dayChangeNextWeek
  }
}

export function calendarIdToFillStyle(calendarId: string | undefined | null): FillStyle {
  if (!calendarId)
    return 'white'

  if (calendarId.endsWith('@gmail.com'))
    return 'medium'
  if (calendarId.endsWith('4a0d085fecdb@group.calendar.google.com'))
    return 'lighter'
  if (calendarId.endsWith('ma11s9l5fagk@group.calendar.google.com'))
    return 'dark-shade'
  if (calendarId.endsWith('a7f62b9c2c26@group.calendar.google.com'))
    return 'lighter-shade'
  if (calendarId.endsWith('g4krado1rk7k@group.calendar.google.com'))
    return 'dark'
  return 'black'
}

export function hexToFillStyle(hex: string | number): FillStyle {
  const parsedHex = typeof hex === 'number'
    ? hex
    : (() => {
      const cleaned = hex.trim().replace(/^#/, '').replace(/^0x/i, '')
      if (cleaned.length === 3)
        return parseInt(cleaned.split('').map((c) => c + c).join(''), 16)
      return parseInt(cleaned, 16)
    })()

  const color = Number.isFinite(parsedHex) ? (parsedHex & 0xffffff) : 0
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff

  // Relative luminance approximation weighted for human perception.
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min

  let hue = 0
  if (chroma !== 0) {
    if (max === r) hue = ((g - b) / chroma) % 6
    else if (max === g) hue = (b - r) / chroma + 2
    else hue = (r - g) / chroma + 4
    hue /= 6
    if (hue < 0) hue += 1
  }

  const sat = max === 0 ? 0 : chroma / max

  const luminanceBuckets = [0.318, 0.445, 0.555, 0.682]
  let bucketIndex = 0
  while (bucketIndex < luminanceBuckets.length && luminance > luminanceBuckets[bucketIndex])
    bucketIndex++

  const palette: FillStyle[][] = [
    ['dark', 'dark-shade'],
    ['medium', 'checker'],
    ['light-shade', 'light'],
    ['lighter-shade', 'lighter'],
    ['lightest-shade', 'lightest']
  ]

  // Use hue/saturation and channel mix so same-luminance colors can map differently.
  const variantSeed = ((Math.floor(hue * 360) * 17) ^ (Math.floor(sat * 255) * 13) ^ (r * 3 + g * 5 + b * 7)) & 1
  return palette[bucketIndex][variantSeed]
}
