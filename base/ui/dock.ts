import type { WeatherApi } from "../api/weather"
import { icons } from "../lib/icons"
import type { Renderer } from "../lib/image"
import type { usePaint } from "../lib/paint"


const weatherCodeShort: Record<number, string> = {
  [0]: 'H', // Clear sky
  [1]: 'G', // Mainly clear
  [2]: 'F', // partly cloudy
  [3]: 'E', // overcast

  [45]: 'Z', // Fog
  [48]: 'Y', // Depositing rime fog

  [51]: 'C', // Drizzle: Light
  [53]: 'A', // Dizzle: moderate
  [55]: 'B', // Drizzle: dense
  [56]: 'Q', // Freezing Drizzle: Light
  [57]: 'Q', // Freezing Drizzle: dense

  [61]: 'C', // Rain: Slight
  [63]: 'A', // Rain: moderate
  [65]: 'B', // Rain: heavy
  [66]: 'Q', // Freezing Rain: Light
  [67]: 'Q', // Freezing Rain: heavy

  [71]: 'l', // Snow fall: Slight
  [73]: 'n', // Snow fall: moderate
  [75]: 'i', // Snow fall: heavy
  [77]: 'j', // Snow grains

  [80]: 'C', // Rain showers: Slight
  [81]: 'A', // Rain showers: moderate
  [82]: 'B', // Rain showers: violent
  [85]: 'l', // Snow showers: slight
  [86]: 'i', // Snow showers: heavy

  [95]: 'U', // Thunderstorm: Slight or moderate
  [96]: 'U', // Thunderstorm with slight hail
  [99]: 'U', // Thunderstorm with heavy hail
}

const weekdayShort = [ 'SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA' ]

export function drawDock(weather: WeatherApi): Renderer {
  return ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('medium')
    paint.newRect(0, 0, width, 1)
      .fill('black')
      
    const padding = 6
    const heightMinusPadding = height - padding * 2


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

      // if (weekdayAtI === 6 || weekdayAtI === 0) {
      //   paint.newRect()
      //     .from(i * (dayWidth + dayPadding) - 2, height - padding - 3)
      //     .sized(dayWidth + 4, padding)
      //     .round(2)
      //     .fill('white')
      // }

      paint.newRect()
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

      paint.newText(weather.getDay(i).temperatureMax + '°')
        .anchor('center', 'top')
        .at(left + dayWidth / 2, 8)
        .size(11)
        .threshold(0.8)
        .render('black')

      paint.newText(weekdayShort[weekdayAtI])
        .anchor('center', 'center')
        .at(left + dayWidth / 2, heightMinusPadding / 2)
        .size(15)
        .threshold(1)
        .render('black')

      // paint.newText(weather.getDay(i).temperatureMin + '°')
      // paint.newText(weatherCodeShort[weather.getDay(i).weatherCode])
      //   .anchor('center', 'bottom')
      //   .at(left + dayWidth / 2, heightMinusPadding -8)
      //   .size(11)
      //   .threshold(0.8)
      //   .render('black')
      paint.newIcon(icons.clouds)
        .at(left + dayWidth / 2, heightMinusPadding - 8)
        .anchor('center', 'center')
        .fill('black')
    }

    // paint.transform(padding, padding)
    // for (const el of left) {
    //   const taken = el({ paint, height: height - padding*2, padding })
    //   paint.transform(taken + padding*2, -padding)
    //   // paint.newRect(0, 0, 1, height).fill('medium')
    //   paint.transform(padding*2 + 1, padding)
    // }

    // paint.clearTransform()
  }
}
