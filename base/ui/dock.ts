import type { HolidaysApi } from "../api/holidays"
import type { HomeioApi } from "../api/homeio"
import type { WeatherApi } from "../api/weather"
import { icons } from "../lib/icons"
import type { Renderer } from "../lib/image"
import { getDayLength } from "../lib/sun-position"


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

export function drawDock(weather: WeatherApi, holidays: HolidaysApi, localTemperature?: number | string): Renderer {
  return ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('medium')
    paint.newRect(0, 0, width, 2)
      .fill('black')

    const padding = 6
    const heightMinusPadding = height - padding * 2
    const boxPadding = 15
    let leftX = padding

    // Local temperature
    if (localTemperature) {
      const rounded = Math.round(typeof localTemperature === 'string' ? parseFloat(localTemperature) : localTemperature)
      const width = paint.newText(rounded + '°')
        .at(leftX + boxPadding, padding + heightMinusPadding / 2)
        .size(16)
        .anchor('left', 'center')
        .useRect(rect => rect.round(3)
          .inset(-boxPadding, 0)
          .from(null, padding)
          .sized(rect.getSize().width + rect.getSize().width%2, heightMinusPadding)
          .fill('white')
          .translate(2, 2)
          .fill('dark')
          .translate(-2, -2)
          .fill('black')
          .inset(1)
          .fill('white')
        )
        .render('black')
        .toRect()
        .getSize()
        .width
      leftX += width + padding + boxPadding * 2
    }

    const today = new Date()
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const dayLength = getDayLength(dayOfYear)
    const dayChangeToday = Math.floor((dayLength - getDayLength(dayOfYear - 1)) * 60)
    const dayChangeNextWeek = Math.floor((getDayLength(dayOfYear + 7) - dayLength) * 60)

    leftX += leftX % 2 // visual offset for dithering
    paint.newRect(leftX, padding, heightMinusPadding, heightMinusPadding)
      .round(3)
      .fill('white')
      .translate(2, 2)
      .fill('dark')
      .translate(-2, -2)
      .fill('black')
      .inset(1)
      .fill('white')

    paint
      .newBitText(`${dayChangeToday >= 0 ? '+' : ''}${dayChangeToday}`)
      .at(leftX + heightMinusPadding / 2, padding + heightMinusPadding / 2)
      .size(16)
      .anchor('center', 'bottom')
      .render('black')
    paint
      .newRect(leftX + 2, height / 2)
      .sized(heightMinusPadding - 4, 1)
      .fill('medium')
    paint
      .newBitText(`${dayChangeNextWeek >= 0 ? '+' : ''}${dayChangeNextWeek}`)
      .at(leftX + heightMinusPadding / 2, padding + heightMinusPadding / 2 + 5)
      .size(16)
      .anchor('center', 'top')
      .render('black')


    // draw weather info
    const numDays = 7
    const dayWidth = heightMinusPadding
    const dayPadding = 4
    const startX = width - numDays * (dayWidth + dayPadding) + dayPadding - padding
    paint.transform(startX, padding + height - height)
    const weekdayToday = new Date().getDay()
    // wettervorhersage für die nächsten 7 (idealerweise 10) tag + wochenende / feiertage
    for (let i = 0; i < numDays; i++) {
      const weekdayAtI = (weekdayToday + i) % 7
      const left = i * (dayWidth + dayPadding)

      const box = paint.newRect()
        .from(left, 0)
        .sized(dayWidth, heightMinusPadding)
        .round(3)
        .fill('white')
        .translate(2, 2)
        .fill('dark')
        .translate(-2, -2)
        .fill('black')
        .inset(1)
        .fill('white')

      const isHoliday = weekdayAtI === 0 || holidays.isHolidayInXDays(i)
      if (isHoliday) {
        box
          .inset(1)
          .fill('black')
      }

      paint.newText(Math.round(weather.getDay(i).temperatureMax) + '°')
        .anchor('center', 'top')
        .at(left + dayWidth / 2, 8)
        .size(11)
        .threshold(0.8)
        .render('black', 'invert')

      paint.newText(weekdayShort[weekdayAtI])
        .anchor('center', 'center')
        .at(left + dayWidth / 2, heightMinusPadding / 2 + 1)
        .size(15)
        .threshold(1)
        .render('black', 'invert')

      paint.newIcon(weatherCodeIcons[weather.getDay(i).weatherCode])
        .at(left + dayWidth / 2, heightMinusPadding - 9)
        .anchor('center', 'center')
        .fill('black', 'invert')
    }
  }
}
