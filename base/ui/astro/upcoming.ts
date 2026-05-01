import type { GCalendarApi } from "../../api/gcalendar"
import type { HolidaysApi } from "../../api/holidays"
import type { WeatherApi } from "../../api/weather"
import { cFont } from "../../lib/c-font"
import { icons } from "../../lib/icons"
import type { Renderer } from "../../lib/image"
import { TextUtils } from "../../lib/text-utils"


const weatherCodeIcons: Record<number, number[]> = {
  [0]: icons.sunny, // Clear sky
  [1]: icons.sunny, // Mainly clear
  [2]: icons.sunny, // partly cloudy
  [3]: icons.clouds, // overcast

  [45]: icons.foggy, // Fog
  [48]: icons.foggy, // Depositing rime fog

  [51]: icons.clouds, // Drizzle: Light
  [53]: icons.rainy, // Dizzle: moderate
  [55]: icons.rainy, // Drizzle: dense
  [56]: icons.rainy, // Freezing Drizzle: Light
  [57]: icons.rainy, // Freezing Drizzle: dense

  [61]: icons.rainy, // Rain: Slight
  [63]: icons.showers, // Rain: moderate
  [65]: icons.showers, // Rain: heavy
  [66]: icons.rainy, // Freezing Rain: Light
  [67]: icons.rainy, // Freezing Rain: heavy

  [71]: icons.snowy, // Snow fall: Slight
  [73]: icons.snowy, // Snow fall: moderate
  [75]: icons.snowy, // Snow fall: heavy
  [77]: icons.snowy, // Snow grains

  [80]: icons.rainy, // Rain showers: Slight
  [81]: icons.showers, // Rain showers: moderate
  [82]: icons.showers, // Rain showers: violent
  [85]: icons.snowy, // Snow showers: slight
  [86]: icons.snowy, // Snow showers: heavy

  [95]: icons.lightning, // Thunderstorm: Slight or moderate
  [96]: icons.lightning, // Thunderstorm with slight hail
  [99]: icons.lightning, // Thunderstorm with heavy hail
}

const weekdayShort = [ 'SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA' ]

export function drawUpcoming(calendarApi: GCalendarApi, holidays: HolidaysApi, weather: WeatherApi, asOverlay: boolean): Renderer<void> {
  return ({ paint, width, height }) => {
    const padding = 6
    const numDays = 7
    const boxSize = 44

    const calendar = calendarApi.getData()
    const upcoming = calendar.events
      .filter(event => event.isUpcoming && event.start.getTime() <= new Date().getTime() + numDays * 24 * 60 * 60 * 1000) // upcoming within 6 days
      .sort((a, b) => {
        // First, compare by day
        const dayA = new Date(a.start.getTime())
        dayA.setHours(0, 0, 0, 0)
        const dayB = new Date(b.start.getTime())
        dayB.setHours(0, 0, 0, 0)
        
        const dayCompare = dayA.getTime() - dayB.getTime()
        if (dayCompare !== 0) {
          return dayCompare
        }
        
        // If same day, sort all-day events first
        if (a.isAllDay !== b.isAllDay) {
          return a.isAllDay ? -1 : 1 // all-day first
        }
        
        // Otherwise, sort by time
        return a.start.getTime() - b.start.getTime()
      })
    const upcomingByDate = Object.groupBy(upcoming, event => `${event.start.getMonth()}-${event.start.getDate()}` as string)

    let y = padding
    for (let i = 0; i < numDays; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
      
      const dateKey = `${date.getMonth()}-${date.getDate()}`
      const isHoliday = date.getDay() === 0 || holidays.isHolidayInXDays(i)
      const events = upcomingByDate[dateKey] || []

      paint.newRect()
        .translate(width - padding - boxSize, y)
        .sized(boxSize, boxSize)
        .round(6)
        .fill('white')
        .translate(2, 2)
        .fill('medium', 'darken')
        .translate(-2, -2)
        .fill('black')
        .inset(1)
        .fill('white')
        .breakIf(!isHoliday)
        .inset(1)
        .fill('black')

      paint.newText(Math.round(weather.getDay(i).temperatureMax) + '°')
        .anchor('right', 'bottom')
        .at(width - padding - 5, y + boxSize - 8)
        .size(16)
        .threshold(0.9)
        .render('black', 'invert')

      paint.newBitText(weekdayShort[date.getDay()])
        .anchor('right', 'top')
        .at(width - padding - 6, y + 7)
        .size(12)
        .render('black', 'invert')

      paint.newIcon(weatherCodeIcons[weather.getDay(i).weatherCode])
        .at(width - padding - boxSize + 13, y + 13)
        .anchor('center', 'center')
        .fill('black', 'invert')

      if (i > 0 && events.length > 0) {
        const lineCount = Math.min(events.length, 3)
        const lineHeight = 11
        const vPadding = Math.round((boxSize - lineHeight*lineCount) / 2)
        const vHeight = boxSize - vPadding*2
        const maxCharsPerLine = Math.floor((width - padding*2 - boxSize - padding) / cFont.f12.width)

        const lines = []
        for (let j = 0; j < lineCount; j++) {
          const summaryText = (events.length > 3) && j === 2
            ? `+${events.length - 2} more`
            : TextUtils.trimToLength(events[j].summary.split('').filter(c => c in cFont.f12).join('').trim(), maxCharsPerLine)
          lines.push(summaryText)
        }

        const maxLineWidth = Math.max(...lines.map(line => line.length)) * cFont.f12.width
        const bgPadding = 3

        paint.newRect()
          .from(width - padding - boxSize - padding + bgPadding, y + vPadding - bgPadding)
          .sized(-maxLineWidth - bgPadding*2, vHeight + bgPadding*2)
          .round(3)
          .fill('white')

        for (let j = 0; j < lineCount; j++) {
          paint.newBitText(lines[j])
            .anchor('right', 'top')
            .at(width - padding - boxSize - padding, y + vPadding + j * lineHeight)
            .size(12)
            .render('black', 'invert')
        }
      }

      y += boxSize + padding
    }

    return

    if (!upcoming.length || y >= height - padding)
      return

    y += padding - 10
    if (y < height / 4 - padding) {
      y = height / 4 + padding
    } else if (asOverlay) {
      y += padding * 2
    } else {
      paint
        .newRect(padding, y, width, 1)
        .inset(0.5)
        .fill('medium')
      y += padding
    }

    paint
      .newRect(padding - 1, y - 4, 25, height)
      .round(-4)
      .inset(-1)
      .fill('white')
      .inset(1)
      .fill('medium')

    let lastDate = ''
    let lastX = 0
    let connectToTop = false
    for (let i = 0; i < 12; i++) {
      if (y >= height - padding * 2) break
      const event = upcoming[i]
      if (!event) break

      const inset = 5
      let x = padding + inset

      const date = new Date(event.start).toLocaleDateString('de-DE', { weekday: 'short' })
      if (date !== lastDate) {
        const textTime = paint.newBitText(date)
          .at(x, y)
          .size(12)
          .anchor('left', 'top')
          .useRect(r => {
            paint
              .newRect(padding + 1, y - 2, 21, r.getSize().height + 1)
              .round(-2)
              .fill('white')
          })
          .render('black')

        const width = textTime.toRect().getSize().width + inset + 5
        x += width
        lastDate = date
        lastX = width
        connectToTop = false
      } else {
        x += lastX
        y -= 11
        connectToTop = true
      }

      const textEvent = paint.newBitText(event.summary)
        .maxWidth(width - x + padding)
        .at(x, y)
        .size(12)
        .anchor('left', 'top')
        .useRect(r => {
          r
            .translate(0, -1)
            .round(-2)
            .inset(-4, -2)
            .fill('white')
          if (connectToTop)
            r.translate(0, -3)
              .round(-1)
              .fill('white')
        })
        .render('black')

      y += textEvent.toRect().getSize().height + 15
    }
  }
}
