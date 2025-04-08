import type { WeatherApi } from "../api/weather"
import { icons } from "../lib/icons"
import type { Renderer } from "../lib/image"
import type { usePaint } from "../lib/paint"


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
  [63]: icons.rainy, // Rain: moderate
  [65]: icons.rainy, // Rain: heavy
  [66]: icons.rainy, // Freezing Rain: Light
  [67]: icons.rainy, // Freezing Rain: heavy

  [71]: icons.snowy, // Snow fall: Slight
  [73]: icons.snowy, // Snow fall: moderate
  [75]: icons.snowy, // Snow fall: heavy
  [77]: icons.snowy, // Snow grains

  [80]: icons.showers, // Rain showers: Slight
  [81]: icons.showers, // Rain showers: moderate
  [82]: icons.showers, // Rain showers: violent
  [85]: icons.snowy, // Snow showers: slight
  [86]: icons.snowy, // Snow showers: heavy

  [95]: icons.lightning, // Thunderstorm: Slight or moderate
  [96]: icons.lightning, // Thunderstorm with slight hail
  [99]: icons.lightning, // Thunderstorm with heavy hail
}

const weekdayShort = [ 'SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA' ]

export function drawDock(weather: WeatherApi): Renderer {
  return ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('medium')
    paint.newRect(0, 0, width, 2)
      .fill('black')

    const padding = 6
    const heightMinusPadding = height - padding * 2

    // draw network info
    const data = [ true, true, false ]
    const dataIcons = [ icons.v, icons.m, icons.f ]
    paint.newRect()
      .from(padding, padding)
      .sized(heightMinusPadding * 2, heightMinusPadding)
      .round(3)
      .fill('white')
      .translate(2, 2)
      .fill('dark')
      .translate(-2, -2)
      .fill('black')
      .inset(1)
      .fill('white')

    for (let i = 0; i < data.length; i++) {
      const left = padding + heightMinusPadding / 2 * (i + 1)

      paint.newIcon(dataIcons[i])
        .at(left, heightMinusPadding / 2 + padding)
        .anchor('center', 'center')
        .fill('black')

      if (data[i]) {
        paint.newRect()
          .from(left - 12, heightMinusPadding / 2 + padding - 13)
          .sized(23, 26)
          .round(2)
          .fill('black', 'invert')
      }
    }

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

      const isWeekend = weekdayAtI === 6 || weekdayAtI === 0
      if (isWeekend) {
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
