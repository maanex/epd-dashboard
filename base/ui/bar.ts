import type { WeatherApi } from "../api/weather"
import type { Renderer } from "../lib/image"
import type { usePaint } from "../lib/paint"


type Element = (opts: {
  paint: ReturnType<typeof usePaint>,
  height: number
  padding: number
}) => number


const left: Element[] = [
  ({ paint, height, padding }) => {
    paint.newYarndings('=')
      .at(height/2, height/2)
      .anchor('center', 'center')
      .render('white')

    paint.newYarndings('+')
      .at(height/2 + height + padding, height/2)
      .anchor('center', 'center')
      .render('white')

    paint.newYarndings('<')
      .at(height/2 + height*2 + padding*2, height/2)
      .anchor('center', 'center')
      .render('white')

    return height * 3 + padding * 2
  },
  // ({ paint, height }) => {
  //   const bounds = paint
  //     .newText('hehehehehehe :3')
  //     .anchor('left', 'bottom')
  //     .at(0, height)
  //     .render('white')
  //     .toRect()
  //   return bounds.getSize().width
  // },
]

const weatherCodeToYarndings: Record<number, string> = {
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

export function drawBar(weather: WeatherApi): Renderer {
  return ({ paint, width, height }) => {
    paint.newRect(0, 0, width, height)
      .fill('black')

    const padding = 5
    paint.transform(padding, padding)
    for (const el of left) {
      const taken = el({ paint, height: height - padding*2, padding })
      paint.transform(taken + padding*2, -padding)
      paint.newRect(0, 0, 1, height).fill('medium')
      paint.transform(padding*2 + 1, padding)
    }

    paint.clearTransform()
    const numDays = 7
    const dayWidth = height - padding*2
    const dayPadding = 5
    const startX = width - numDays * (dayWidth + dayPadding) - dayPadding + padding
    paint.transform(startX, padding + height - height)

    const weekdayToday = new Date().getDay()
    // wettervorhersage für die nächsten 7 (idealerweise 10) tag + wochenende / feiertage
    for (let i = 0; i < numDays; i++) {
      const weekdayAtI = (weekdayToday + i) % 7

      paint.newYarndings(weatherCodeToYarndings[weather.getDay(i).weatherCode] ?? '-')
        .at(i * (dayWidth + dayPadding), 0)
        .render('white')

      if (weekdayAtI === 6 || weekdayAtI === 0) {
        paint.newRect()
          .from(i * (dayWidth + dayPadding) - 2, height - padding - 3)
          .sized(dayWidth + 4, padding)
          .round(2)
          .fill('white')
      }
    }
  }
}
